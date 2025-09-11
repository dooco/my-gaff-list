from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import timedelta, datetime

from apps.core.models import Property, Landlord
from apps.users.models import PropertyEnquiry, UserActivity
from .models import LandlordProfile, PropertyStats
from apps.messaging.models import Conversation, Message
from .serializers import (
    LandlordRegistrationSerializer, LandlordProfileSerializer,
    PropertyCreateSerializer, PropertyListSerializer, PropertyDetailSerializer,
    PropertyUpdateSerializer, EnquiryManagementSerializer, LandlordDashboardStatsSerializer
)
from .permissions import IsLandlord

User = get_user_model()


class LandlordRegistrationView(generics.CreateAPIView):
    """Landlord registration endpoint"""
    serializer_class = LandlordRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == 201:
            # Generate JWT tokens for the new landlord
            user = User.objects.get(email=request.data['email'])
            refresh = RefreshToken.for_user(user)
            
            response.data.update({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'user_type': user.user_type
                }
            })
            
            # Log registration activity
            UserActivity.objects.create(
                user=user,
                activity_type='profile_updated',
                description='Landlord registered',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        
        return response


class LandlordProfileView(generics.RetrieveUpdateAPIView):
    """Landlord profile management"""
    serializer_class = LandlordProfileSerializer
    permission_classes = [IsAuthenticated, IsLandlord]
    
    def get_object(self):
        profile, created = LandlordProfile.objects.get_or_create(
            user=self.request.user,
            defaults={'landlord': Landlord.objects.get(email=self.request.user.email)}
        )
        return profile


class PropertyManagementViewSet(viewsets.ModelViewSet):
    """Property management for landlords"""
    permission_classes = [IsAuthenticated, IsLandlord]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PropertyCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PropertyUpdateSerializer
        elif self.action == 'retrieve':
            return PropertyDetailSerializer
        return PropertyListSerializer
    
    def get_queryset(self):
        """Return only properties belonging to the current landlord"""
        print(f"PropertyManagementViewSet.get_queryset() called for user: {self.request.user.email}")
        
        # Check if we should include deleted properties
        include_deleted = self.request.query_params.get('include_deleted', 'false').lower() == 'true'
        
        try:
            landlord_profile = LandlordProfile.objects.get(user=self.request.user)
            queryset = Property.objects.filter(landlord=landlord_profile.landlord)
            print(f"Found {queryset.count()} properties for landlord profile")
        except LandlordProfile.DoesNotExist:
            # If no LandlordProfile, try to get properties by owner
            print(f"No LandlordProfile found, filtering by owner")
            queryset = Property.objects.filter(owner=self.request.user)
            print(f"Found {queryset.count()} properties by owner")
        
        # Filter out deleted properties unless specifically requested
        if not include_deleted:
            queryset = queryset.filter(deleted_at__isnull=True)
        
        return queryset
    
    def get_object(self):
        """Get a specific property ensuring it belongs to the current user"""
        print(f"PropertyManagementViewSet.get_object() called")
        obj = super().get_object()
        print(f"Retrieved property: {obj.id} - {obj.title}")
        return obj
    
    def perform_create(self, serializer):
        """Set the landlord when creating a property"""
        try:
            landlord_profile = LandlordProfile.objects.get(user=self.request.user)
            serializer.save(landlord=landlord_profile.landlord, owner=self.request.user)
        except LandlordProfile.DoesNotExist:
            # If no LandlordProfile, check if user has a Landlord record
            try:
                landlord = Landlord.objects.get(email=self.request.user.email)
                serializer.save(landlord=landlord, owner=self.request.user)
            except Landlord.DoesNotExist:
                # Just save with owner only
                serializer.save(owner=self.request.user)
    
    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for updating properties"""
        print(f"\n=== PropertyManagementViewSet.partial_update() ===")
        print(f"Property ID: {kwargs.get('pk')}")
        print(f"Content-Type: {request.content_type}")
        print(f"Request method: {request.method}")
        
        try:
            # Get the property instance
            instance = self.get_object()
            
            # Create a mutable copy of request data
            if hasattr(request.data, 'dict'):
                data = request.data.dict()
            else:
                # Handle QueryDict or other formats
                data = {}
                for key in request.data.keys():
                    # Get the last value if multiple values exist
                    data[key] = request.data.get(key)
            
            print(f"Request data: {list(data.keys())}")
            
            # Manual update of simple fields to bypass serializer issues
            simple_fields = ['title', 'description', 'address', 'property_type', 'house_type',
                           'bedrooms', 'bathrooms', 'floor_area', 'rent_monthly', 'deposit',
                           'ber_rating', 'ber_number', 'available_from', 'available_to', 
                           'contact_method', 'lease_duration', 'lease_duration_type',
                           'pet_friendly', 'parking_type', 'outdoor_space', 'bills_included',
                           'viewing_type']
            
            for field in simple_fields:
                if field in data and data[field] is not None:
                    value = data[field]
                    try:
                        if field in ['bedrooms', 'bathrooms']:
                            value = int(value) if value and value != '' else getattr(instance, field)
                        elif field in ['floor_area', 'rent_monthly', 'deposit']:
                            value = float(value) if value and value != '' else getattr(instance, field)
                        elif field == 'lease_duration' and value:
                            # Ensure lease_duration is an integer
                            value = int(value) if value and value != '' else getattr(instance, field)
                        elif field in ['pet_friendly', 'bills_included']:
                            # Handle boolean fields
                            if isinstance(value, str):
                                value = value.lower() in ['true', '1', 'yes']
                            else:
                                value = bool(value)
                        elif field in ['available_from', 'available_to'] and value:
                            # Ensure dates are properly formatted
                            from datetime import datetime
                            if isinstance(value, str) and value:
                                try:
                                    # Parse date string if needed
                                    datetime.strptime(value, '%Y-%m-%d')
                                except ValueError:
                                    print(f"Invalid date format for {field}: {value}")
                                    continue
                    except (ValueError, TypeError) as e:
                        print(f"Error converting {field} value '{value}': {e}")
                        continue
                    setattr(instance, field, value)
            
            # Handle furnished field - it should be a string choice, not boolean
            if 'furnished' in data and data['furnished']:
                # Keep the furnished value as is if it's a valid choice
                if data['furnished'] in ['furnished', 'unfurnished', 'part_furnished']:
                    instance.furnished = data['furnished']
                # If someone sends a boolean, convert it
                elif data['furnished'] in ['true', 'True', '1', True]:
                    instance.furnished = 'furnished'
                elif data['furnished'] in ['false', 'False', '0', False]:
                    instance.furnished = 'unfurnished'
            
            # Handle features JSON field
            if 'features' in data:
                import json
                try:
                    features = json.loads(data['features']) if isinstance(data['features'], str) else data['features']
                    instance.features = features if isinstance(features, list) else []
                except:
                    instance.features = []
            
            # Handle county and town
            if 'county_id' in data and data['county_id']:
                try:
                    instance.county_id = int(data['county_id'])
                except (ValueError, TypeError):
                    print(f"Error converting county_id: {data['county_id']}")
            
            if 'town_id' in data and data['town_id']:
                try:
                    instance.town_id = int(data['town_id'])
                except (ValueError, TypeError):
                    print(f"Error converting town_id: {data['town_id']}")
            
            # Save the instance
            instance.save()
            
            # Handle image deletions
            if 'images_to_delete' in data:
                import json
                try:
                    images_to_delete = json.loads(data['images_to_delete']) if isinstance(data['images_to_delete'], str) else data['images_to_delete']
                    if isinstance(images_to_delete, list) and images_to_delete:
                        from apps.core.models import PropertyImage
                        PropertyImage.objects.filter(id__in=images_to_delete, property=instance).delete()
                except:
                    pass
            
            # Handle new image uploads
            if request.FILES:
                from apps.core.models import PropertyImage
                for image_file in request.FILES.getlist('images'):
                    # Set first image as main if no main image exists
                    is_main = not instance.images.filter(is_main=True).exists()
                    PropertyImage.objects.create(
                        property=instance,
                        image=image_file,
                        is_main=is_main
                    )
            
            # Return success response
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
            
        except Exception as e:
            print(f"\n!!! Error during partial_update: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Return a more detailed error response
            return Response({
                'error': str(e),
                'type': type(e).__name__,
                'detail': 'An error occurred while updating the property. Check server logs for details.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle property active status"""
        property_instance = self.get_object()
        property_instance.is_active = not property_instance.is_active
        property_instance.save()
        
        return Response({
            'success': True,
            'is_active': property_instance.is_active,
            'message': f'Property {"activated" if property_instance.is_active else "deactivated"}'
        })
    
    @action(detail=True, methods=['post'])
    def test_update(self, request, pk=None):
        """Test endpoint for debugging update issues"""
        property_instance = self.get_object()
        
        print(f"\n=== TEST UPDATE ===")
        print(f"Property: {property_instance.title}")
        print(f"Request data: {request.data}")
        
        # Just update the title as a test
        if 'title' in request.data:
            property_instance.title = request.data['title']
            property_instance.save()
            
        return Response({
            'success': True,
            'message': 'Test update successful',
            'title': property_instance.title
        })
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get detailed statistics for a property"""
        property_instance = self.get_object()
        
        # Calculate statistics
        total_enquiries = property_instance.enquiries.count()
        recent_enquiries = property_instance.enquiries.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Response rate
        responded_enquiries = property_instance.enquiries.filter(
            status__in=['replied', 'read']
        ).count()
        response_rate = (responded_enquiries / total_enquiries * 100) if total_enquiries > 0 else 0
        
        return Response({
            'total_views': property_instance.view_count,
            'total_enquiries': total_enquiries,
            'recent_enquiries': recent_enquiries,
            'response_rate': round(response_rate, 1),
            'average_response_time': '2.5 hours',  # TODO: Calculate from actual data
            'last_updated': property_instance.updated_at
        })
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete a property"""
        property_instance = self.get_object()
        property_instance.soft_delete()
        
        return Response({
            'success': True,
            'message': 'Property deleted successfully',
            'deleted_at': property_instance.deleted_at
        })
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a soft deleted property"""
        # Get the property including deleted ones
        try:
            property_instance = Property.objects.get(
                pk=pk,
                owner=request.user,
                deleted_at__isnull=False
            )
        except Property.DoesNotExist:
            return Response({
                'error': 'Property not found or not deleted'
            }, status=status.HTTP_404_NOT_FOUND)
        
        property_instance.restore()
        
        return Response({
            'success': True,
            'message': 'Property restored successfully',
            'is_active': property_instance.is_active
        })


class EnquiryManagementViewSet(viewsets.ReadOnlyModelViewSet):
    """Enquiry management for landlords"""
    serializer_class = EnquiryManagementSerializer
    permission_classes = [IsAuthenticated, IsLandlord]
    
    def get_queryset(self):
        """Return enquiries for landlord's properties"""
        landlord_profile = LandlordProfile.objects.get(user=self.request.user)
        return PropertyEnquiry.objects.filter(
            property__landlord=landlord_profile.landlord
        ).order_by('-created_at')
    
    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark enquiry as read"""
        enquiry = self.get_object()
        if enquiry.status == 'sent':
            enquiry.status = 'read'
            enquiry.save()
        
        return Response({'success': True, 'status': enquiry.status})
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Respond to an enquiry"""
        enquiry = self.get_object()
        response_message = request.data.get('response', '')
        
        if not response_message:
            return Response(
                {'error': 'Response message is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        enquiry.landlord_response = response_message
        enquiry.response_date = timezone.now()
        enquiry.status = 'replied'
        enquiry.save()
        
        # Send message in conversation if exists
        property_obj = enquiry.property
        enquirer = enquiry.user
        landlord_user = request.user
        
        # Find existing conversation
        conversation = Conversation.objects.filter(
            Q(participant1=enquirer, participant2=landlord_user) |
            Q(participant1=landlord_user, participant2=enquirer),
            property=property_obj
        ).first()
        
        if conversation:
            # Add landlord's response as a message
            Message.objects.create(
                conversation=conversation,
                sender=landlord_user,
                content=response_message
            )
        
        # TODO: Send email notification to enquirer
        
        return Response({
            'success': True,
            'message': 'Response sent successfully',
            'response_date': enquiry.response_date
        })
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending enquiries"""
        queryset = self.get_queryset().filter(status='sent')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsLandlord])
def landlord_dashboard_stats(request):
    """Get landlord dashboard statistics"""
    landlord_profile = LandlordProfile.objects.get(user=request.user)
    landlord = landlord_profile.landlord
    
    # Property statistics
    properties = Property.objects.filter(landlord=landlord)
    total_properties = properties.count()
    active_properties = properties.filter(is_active=True).count()
    
    # Enquiry statistics
    all_enquiries = PropertyEnquiry.objects.filter(property__landlord=landlord)
    total_enquiries = all_enquiries.count()
    pending_enquiries = all_enquiries.filter(status='sent').count()
    
    # View statistics
    total_views = properties.aggregate(Sum('view_count'))['view_count__sum'] or 0
    
    # This month's views (simplified - in production, use PropertyStats model)
    this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month_views = total_views  # Simplified for now
    
    # Response statistics
    avg_response_time = 2.5  # TODO: Calculate from actual response times
    
    # Occupancy rate (properties with recent enquiries)
    properties_with_enquiries = properties.filter(
        enquiries__created_at__gte=timezone.now() - timedelta(days=30)
    ).distinct().count()
    occupancy_rate = (properties_with_enquiries / total_properties * 100) if total_properties > 0 else 0
    
    stats = {
        'total_properties': total_properties,
        'active_properties': active_properties,
        'total_enquiries': total_enquiries,
        'pending_enquiries': pending_enquiries,
        'total_views': total_views,
        'this_month_views': this_month_views,
        'average_response_time': avg_response_time,
        'occupancy_rate': round(occupancy_rate, 1)
    }
    
    serializer = LandlordDashboardStatsSerializer(stats)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_landlord_properties(request):
    """Debug endpoint to check landlord properties"""
    from apps.core.models import Property
    
    # Get all properties for debugging
    all_props = Property.objects.filter(owner=request.user)
    props_by_owner = list(all_props.values('id', 'title', 'created_at'))
    
    # Check landlord profile
    has_profile = False
    landlord_email = None
    props_by_landlord = []
    
    try:
        profile = LandlordProfile.objects.get(user=request.user)
        has_profile = True
        landlord_email = profile.landlord.email
        props_by_landlord = list(Property.objects.filter(landlord=profile.landlord).values('id', 'title', 'created_at'))
    except LandlordProfile.DoesNotExist:
        pass
    
    return Response({
        'user_email': request.user.email,
        'user_type': request.user.user_type,
        'has_landlord_profile': has_profile,
        'landlord_email': landlord_email,
        'properties_by_owner': props_by_owner,
        'properties_by_landlord': props_by_landlord,
        'total_properties': len(props_by_owner)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fix_furnished_field(request):
    """Temporary endpoint to fix furnished field values"""
    from apps.core.models import Property
    from django.db import connection
    
    # Get properties with boolean-like furnished values
    cursor = connection.cursor()
    cursor.execute("""
        SELECT id, furnished 
        FROM core_property 
        WHERE furnished IN ('True', 'False', 'true', 'false', '0', '1')
    """)
    rows = cursor.fetchall()
    
    fixed_count = 0
    for prop_id, furnished_value in rows:
        try:
            property_obj = Property.objects.get(id=prop_id)
            if furnished_value in ['True', 'true', '1']:
                property_obj.furnished = 'furnished'
            else:
                property_obj.furnished = 'unfurnished'
            property_obj.save()
            fixed_count += 1
        except Property.DoesNotExist:
            continue
    
    return Response({
        'message': f'Fixed {fixed_count} properties with boolean furnished values',
        'properties_checked': len(rows)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsLandlord])
def recent_activity(request):
    """Get recent activity for landlord's properties"""
    landlord_profile = LandlordProfile.objects.get(user=request.user)
    
    # Recent enquiries
    recent_enquiries = PropertyEnquiry.objects.filter(
        property__landlord=landlord_profile.landlord,
        created_at__gte=timezone.now() - timedelta(days=7)
    ).select_related('property').order_by('-created_at')[:5]
    
    activities = []
    for enquiry in recent_enquiries:
        activities.append({
            'type': 'enquiry',
            'message': f'New enquiry for {enquiry.property.title}',
            'property': enquiry.property.title,
            'user': enquiry.name,
            'timestamp': enquiry.created_at,
            'status': enquiry.status
        })
    
    return Response({'activities': activities})
from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import User, UserProfile, SavedProperty, PropertyEnquiry, UserActivity
from .serializers import (
    UserCreateSerializer, UserSerializer, UserUpdateSerializer, UserProfileSerializer,
    ChangePasswordSerializer, SavedPropertySerializer, PropertyEnquirySerializer,
    UserActivitySerializer, LoginSerializer, DashboardStatsSerializer
)
from apps.core.models import Property
from apps.messaging.models import Conversation, Message


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view with user data"""
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Get user data
            serializer = LoginSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                user = serializer.validated_data['user']
                user_serializer = UserSerializer(user)
                
                # Log login activity
                UserActivity.objects.create(
                    user=user,
                    activity_type='login',
                    description=f'User logged in from {request.META.get("REMOTE_ADDR")}',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                response.data['user'] = user_serializer.data
        
        return response


class RegisterView(generics.CreateAPIView):
    """User registration view"""
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == 201:
            # Generate JWT tokens for the new user
            user = User.objects.get(email=request.data['email'])
            refresh = RefreshToken.for_user(user)
            
            response.data.update({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
            
            # Log registration activity
            UserActivity.objects.create(
                user=user,
                activity_type='profile_updated',
                description='User registered',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        
        return response


class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile view"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class UserProfileDetailView(generics.RetrieveUpdateAPIView):
    """User profile detail view"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class ChangePasswordView(generics.UpdateAPIView):
    """Change password view"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user = self.get_object()
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Log password change
            UserActivity.objects.create(
                user=user,
                activity_type='profile_updated',
                description='Password changed',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({'detail': 'Password updated successfully.'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SavedPropertiesViewSet(viewsets.ModelViewSet):
    """ViewSet for user's saved properties"""
    serializer_class = SavedPropertySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SavedProperty.objects.filter(user=self.request.user).select_related('property__county', 'property__town')
    
    def perform_create(self, serializer):
        # Check if property is already saved
        property_id = serializer.validated_data['property'].id
        if SavedProperty.objects.filter(user=self.request.user, property_id=property_id).exists():
            return Response(
                {'detail': 'Property is already saved.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer.save(user=self.request.user)
        
        # Log activity
        UserActivity.objects.create(
            user=self.request.user,
            activity_type='property_saved',
            description=f'Saved property: {serializer.validated_data["property"].title}',
            metadata={'property_id': str(property_id)}
        )
    
    def perform_destroy(self, instance):
        # Log activity
        UserActivity.objects.create(
            user=self.request.user,
            activity_type='property_unsaved',
            description=f'Unsaved property: {instance.property.title}',
            metadata={'property_id': str(instance.property.id)}
        )
        
        instance.delete()
    
    @action(detail=False, methods=['post'])
    def toggle_save(self, request):
        """Toggle save/unsave property"""
        property_id = request.data.get('property_id')
        
        if not property_id:
            return Response({'error': 'Property ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            property_obj = Property.objects.get(id=property_id, is_active=True)
        except Property.DoesNotExist:
            return Response({'error': 'Property not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        saved_property, created = SavedProperty.objects.get_or_create(
            user=request.user,
            property=property_obj,
            defaults={'notes': request.data.get('notes', '')}
        )
        
        if created:
            # Property was saved
            UserActivity.objects.create(
                user=request.user,
                activity_type='property_saved',
                description=f'Saved property: {property_obj.title}',
                metadata={'property_id': str(property_id)}
            )
            return Response({'saved': True, 'message': 'Property saved successfully.'})
        else:
            # Property was already saved, so unsave it
            saved_property.delete()
            UserActivity.objects.create(
                user=request.user,
                activity_type='property_unsaved',
                description=f'Unsaved property: {property_obj.title}',
                metadata={'property_id': str(property_id)}
            )
            return Response({'saved': False, 'message': 'Property removed from saved list.'})


class UserEnquiriesViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user's property enquiries"""
    serializer_class = PropertyEnquirySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PropertyEnquiry.objects.filter(
            user=self.request.user
        ).select_related('property__county', 'property__town', 'property__landlord')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_property_enquiry(request):
    """Create a new property enquiry"""
    user = request.user
    property_id = request.data.get('property_id')
    message = request.data.get('message', '').strip()
    phone = request.data.get('phone', '').strip()
    preferred_contact_method = request.data.get('preferred_contact_method', 'email')
    viewing_preference = request.data.get('viewing_preference', 'flexible')
    
    # Validation
    if not property_id:
        return Response({'error': 'Property ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not message:
        return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        property_obj = Property.objects.get(id=property_id, is_active=True)
    except Property.DoesNotExist:
        return Response({'error': 'Property not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user already sent an enquiry for this property recently (within 24 hours)
    recent_enquiry = PropertyEnquiry.objects.filter(
        user=user,
        property=property_obj,
        created_at__gte=timezone.now() - timezone.timedelta(hours=24)
    ).first()
    
    if recent_enquiry:
        return Response({
            'error': 'You have already sent an enquiry for this property recently. Please wait before sending another.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create the enquiry
    enquiry = PropertyEnquiry.objects.create(
        user=user,
        property=property_obj,
        name=user.full_name,
        email=user.email,
        phone=phone,
        message=message,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )
    
    # Create a conversation for messaging
    landlord_user = property_obj.owner  # Assuming property has an owner field
    if landlord_user and landlord_user != user:
        # Check if conversation already exists
        existing_conversation = Conversation.objects.filter(
            Q(participant1=user, participant2=landlord_user) |
            Q(participant1=landlord_user, participant2=user),
            property=property_obj
        ).first()
        
        if not existing_conversation:
            # Create new conversation
            conversation = Conversation.objects.create(
                participant1=user,
                participant2=landlord_user,
                property=property_obj
            )
            
            # Create the initial message
            Message.objects.create(
                conversation=conversation,
                sender=user,
                content=message
            )
    
    # Increment property enquiry count
    property_obj.increment_enquiry_count()
    
    # Log activity
    UserActivity.objects.create(
        user=user,
        activity_type='enquiry_sent',
        description=f'Sent enquiry for property: {property_obj.title}',
        metadata={
            'property_id': str(property_id),
            'preferred_contact_method': preferred_contact_method,
            'viewing_preference': viewing_preference
        },
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )
    
    # Return success response
    serializer = PropertyEnquirySerializer(enquiry)
    return Response({
        'success': True,
        'message': 'Enquiry sent successfully! You should receive a response within 24-48 hours.',
        'enquiry': serializer.data
    }, status=status.HTTP_201_CREATED)


class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user activity tracking"""
    serializer_class = UserActivitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserActivity.objects.filter(user=self.request.user)[:50]  # Last 50 activities


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get user dashboard statistics"""
    user = request.user
    
    # Basic stats for all users
    stats = {
        'saved_properties_count': SavedProperty.objects.filter(user=user).count(),
        'enquiries_sent_count': PropertyEnquiry.objects.filter(user=user).count(),
        'enquiries_replied_count': PropertyEnquiry.objects.filter(
            user=user, status__in=['replied', 'closed']
        ).count(),
        'recent_activities_count': UserActivity.objects.filter(
            user=user, timestamp__gte=timezone.now() - timezone.timedelta(days=7)
        ).count(),
    }
    
    # Calculate profile completion percentage
    completion_fields = [
        user.first_name, user.last_name, user.phone_number,
        user.profile.bio if hasattr(user, 'profile') else None
    ]
    completed_fields = sum(1 for field in completion_fields if field)
    stats['profile_completion_percentage'] = int((completed_fields / len(completion_fields)) * 100)
    
    # Additional stats for landlords/agents
    if user.user_type in ['landlord', 'agent']:
        # These would be implemented when landlords can manage properties
        stats.update({
            'properties_listed_count': 0,  # Property.objects.filter(landlord__user=user).count()
            'enquiries_received_count': 0,  # PropertyEnquiry.objects.filter(property__landlord__user=user).count()
            'properties_views_count': 0,  # Would need view tracking
        })
    
    serializer = DashboardStatsSerializer(stats)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_activity(request):
    """Track user activity"""
    activity_type = request.data.get('activity_type')
    description = request.data.get('description', '')
    metadata = request.data.get('metadata', {})
    
    if not activity_type:
        return Response({'error': 'Activity type is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    activity = UserActivity.objects.create(
        user=request.user,
        activity_type=activity_type,
        description=description,
        metadata=metadata,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )
    
    return Response({'success': True, 'activity_id': activity.id})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_property_saved(request, property_id):
    """Check if a property is saved by the user"""
    is_saved = SavedProperty.objects.filter(
        user=request.user, 
        property_id=property_id
    ).exists()
    
    return Response({'is_saved': is_saved})
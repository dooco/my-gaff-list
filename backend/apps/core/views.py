from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg, Count, Min, Max
from decimal import Decimal
import django_filters
from collections import defaultdict
import math

from .models import County, Town, Property, Landlord, PropertyImage
from .serializers import (
    CountySerializer, TownSerializer, PropertyListSerializer,
    PropertyDetailSerializer, PropertyCreateSerializer, PropertyEnquirySerializer,
    PropertyImageSerializer
)
from .services.geocoding import geocode_property


class PropertyFilter(django_filters.FilterSet):
    """Filter for Property listings"""
    county = django_filters.CharFilter(field_name='county__slug', lookup_expr='iexact')
    town = django_filters.CharFilter(field_name='town__slug', lookup_expr='iexact')
    property_type = django_filters.ChoiceFilter(choices=Property.PROPERTY_TYPES)
    bedrooms = django_filters.NumberFilter()
    bedrooms_min = django_filters.NumberFilter(field_name='bedrooms', lookup_expr='gte')
    bedrooms_max = django_filters.NumberFilter(field_name='bedrooms', lookup_expr='lte')
    rent_min = django_filters.NumberFilter(field_name='rent_monthly', lookup_expr='gte')
    rent_max = django_filters.NumberFilter(field_name='rent_monthly', lookup_expr='lte')
    ber_rating = django_filters.MultipleChoiceFilter(choices=Property.BER_RATINGS)
    furnished = django_filters.ChoiceFilter(choices=Property.FURNISHED_CHOICES)
    search = django_filters.CharFilter(method='search_filter')
    
    class Meta:
        model = Property
        fields = [
            'county', 'town', 'property_type', 'bedrooms', 'bedrooms_min', 
            'bedrooms_max', 'rent_min', 'rent_max', 'ber_rating', 'furnished'
        ]
    
    def search_filter(self, queryset, name, value):
        """Search across title, description, and location"""
        return queryset.filter(
            Q(title__icontains=value) |
            Q(description__icontains=value) |
            Q(town__name__icontains=value) |
            Q(county__name__icontains=value) |
            Q(address__icontains=value)
        )


class CountyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Counties"""
    queryset = County.objects.all()
    serializer_class = CountySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    
    @action(detail=True, methods=['get'])
    def towns(self, request, slug=None):
        """Get all towns for a specific county"""
        county = self.get_object()
        towns = county.towns.all()
        serializer = TownSerializer(towns, many=True)
        return Response(serializer.data)


class TownViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Towns"""
    queryset = Town.objects.select_related('county')
    serializer_class = TownSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['county__slug']


class PropertyViewSet(viewsets.ModelViewSet):
    """ViewSet for Properties"""
    queryset = Property.objects.select_related('county', 'town', 'landlord').filter(is_active=True)
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = PropertyFilter
    ordering_fields = ['rent_monthly', 'created_at', 'bedrooms']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return PropertyListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PropertyCreateSerializer
        return PropertyDetailSerializer
    
    def perform_create(self, serializer):
        """Save the property and geocode it"""
        property_instance = serializer.save()
        
        # Automatically geocode the property if it has an eircode or address
        if property_instance.eircode or property_instance.address:
            try:
                geocode_property(property_instance)
            except Exception as e:
                # Log the error but don't fail the property creation
                print(f"Geocoding failed for property {property_instance.id}: {e}")
    
    def perform_update(self, serializer):
        """Update the property and re-geocode if address/eircode changed"""
        # Check what fields are being updated
        updating_location = any(
            field in serializer.validated_data 
            for field in ['eircode', 'address', 'address_line_1', 'address_line_2', 'town', 'county']
        )
        
        property_instance = serializer.save()
        
        # Re-geocode if location fields were updated
        if updating_location:
            try:
                geocode_property(property_instance)
            except Exception as e:
                # Log the error but don't fail the property update
                print(f"Geocoding failed for property {property_instance.id}: {e}")
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Enhanced search endpoint"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get query parameters
        county_slug = request.query_params.get('county')
        town_slug = request.query_params.get('town')
        search_term = request.query_params.get('search')
        
        # Apply additional filtering
        if county_slug:
            queryset = queryset.filter(county__slug__iexact=county_slug)
        
        if town_slug:
            queryset = queryset.filter(town__slug__iexact=town_slug)
        
        if search_term:
            queryset = queryset.filter(
                Q(title__icontains=search_term) |
                Q(description__icontains=search_term) |
                Q(town__name__icontains=search_term) |
                Q(county__name__icontains=search_term)
            )
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PropertyListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PropertyListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filters(self, request):
        """Get available filter options"""
        return Response({
            'property_types': [{'value': k, 'label': v} for k, v in Property.PROPERTY_TYPES],
            'house_types': [{'value': k, 'label': v} for k, v in Property.HOUSE_TYPES],
            'ber_ratings': [{'value': k, 'label': v} for k, v in Property.BER_RATINGS],
            'furnished_options': [{'value': k, 'label': v} for k, v in Property.FURNISHED_CHOICES],
            'bedroom_options': [{'value': i, 'label': f"{i} bed{'s' if i != 1 else ''}"} for i in range(1, 6)],
            'price_ranges': [
                {'value': '0-1000', 'label': 'Up to €1,000'},
                {'value': '1000-1500', 'label': '€1,000 - €1,500'},
                {'value': '1500-2000', 'label': '€1,500 - €2,000'},
                {'value': '2000-2500', 'label': '€2,000 - €2,500'},
                {'value': '2500-3000', 'label': '€2,500 - €3,000'},
                {'value': '3000-99999', 'label': '€3,000+'},
            ]
        })
    
    @action(detail=True, methods=['post'])
    def enquiry(self, request, pk=None):
        """Submit an enquiry for a property"""
        property_instance = self.get_object()
        
        # Add property to the request data
        data = request.data.copy()
        data['property_id'] = str(property_instance.id)
        
        serializer = PropertyEnquirySerializer(data=data, context={'request': request})
        if serializer.is_valid():
            # Save the enquiry to database
            enquiry = serializer.save()
            
            # Increment view count for property
            property_instance.increment_view_count()
            
            # Log the enquiry for debugging
            print(f"Enquiry received for property {property_instance.title}:")
            print(f"From: {enquiry.name} ({enquiry.email})")
            print(f"Message: {enquiry.message}")
            
            return Response({
                'success': True,
                'message': 'Your enquiry has been sent successfully. The landlord will contact you soon.',
                'property_title': property_instance.title,
                'landlord_response_time': f"{property_instance.landlord.response_time_hours} hours" if property_instance.landlord else "24 hours",
                'enquiry_id': enquiry.id
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        """Track property view"""
        property_instance = self.get_object()
        property_instance.increment_view_count()
        
        return Response({
            'success': True,
            'view_count': property_instance.view_count
        }, status=status.HTTP_200_OK)
    
    def _cluster_properties(self, properties, zoom_level):
        """Cluster properties based on zoom level"""
        # Define clustering distance based on zoom level
        # Higher zoom = smaller clusters (more detail)
        cluster_distances = {
            1: 5.0, 2: 4.0, 3: 3.0, 4: 2.5, 5: 2.0,
            6: 1.5, 7: 1.0, 8: 0.5, 9: 0.25, 10: 0.1,
            11: 0.05, 12: 0.025, 13: 0.01, 14: 0.005,
            15: 0.0025, 16: 0.001, 17: 0.0005, 18: 0.00025
        }
        
        try:
            zoom = int(zoom_level)
        except (ValueError, TypeError):
            zoom = 10
            
        # Don't cluster at high zoom levels
        if zoom >= 15:
            return None
            
        cluster_distance = cluster_distances.get(zoom, 0.1)
        clusters = []
        clustered_props = set()
        
        for prop in properties:
            if prop.id in clustered_props:
                continue
                
            # Start a new cluster with this property
            cluster = {
                'type': 'cluster',
                'latitude': float(prop.latitude),
                'longitude': float(prop.longitude),
                'properties': [prop],
                'count': 1
            }
            
            # Find nearby properties to add to cluster
            for other_prop in properties:
                if other_prop.id == prop.id or other_prop.id in clustered_props:
                    continue
                    
                # Calculate distance (simplified - not exact geographic distance)
                lat_diff = abs(float(prop.latitude) - float(other_prop.latitude))
                lng_diff = abs(float(prop.longitude) - float(other_prop.longitude))
                
                if lat_diff <= cluster_distance and lng_diff <= cluster_distance:
                    cluster['properties'].append(other_prop)
                    cluster['count'] += 1
                    clustered_props.add(other_prop.id)
            
            clustered_props.add(prop.id)
            
            # Update cluster center (average of all properties)
            if cluster['count'] > 1:
                avg_lat = sum(float(p.latitude) for p in cluster['properties']) / cluster['count']
                avg_lng = sum(float(p.longitude) for p in cluster['properties']) / cluster['count']
                cluster['latitude'] = avg_lat
                cluster['longitude'] = avg_lng
                
                # Calculate average rent for cluster
                avg_rent = sum(p.rent_monthly for p in cluster['properties']) / cluster['count']
                cluster['avg_rent'] = int(avg_rent)
                
                # Get rent range
                cluster['min_rent'] = min(p.rent_monthly for p in cluster['properties'])
                cluster['max_rent'] = max(p.rent_monthly for p in cluster['properties'])
            
            clusters.append(cluster)
        
        return clusters
    
    @action(detail=False, methods=['get'])
    def map(self, request):
        """Get properties for map display with lightweight data and optional clustering"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filter by geographic bounds if provided
        north = request.query_params.get('north')
        south = request.query_params.get('south')
        east = request.query_params.get('east')
        west = request.query_params.get('west')
        
        if all([north, south, east, west]):
            try:
                north = Decimal(north)
                south = Decimal(south)
                east = Decimal(east)
                west = Decimal(west)
                
                # Filter properties within bounds
                queryset = queryset.filter(
                    latitude__gte=south,
                    latitude__lte=north,
                    longitude__gte=west,
                    longitude__lte=east,
                    latitude__isnull=False,
                    longitude__isnull=False
                )
            except (ValueError, TypeError):
                pass
        else:
            # If no bounds, only return properties with coordinates
            queryset = queryset.filter(
                latitude__isnull=False,
                longitude__isnull=False
            )
        
        # Get clustering level from params
        zoom_level = request.query_params.get('zoom', '10')
        enable_clustering = request.query_params.get('cluster', 'true').lower() == 'true'
        
        # Limit results for performance
        max_markers = int(request.query_params.get('max_markers', '500'))
        properties = list(queryset[:max_markers])
        
        # Try clustering if enabled and zoom level is appropriate
        if enable_clustering and len(properties) > 10:
            clusters = self._cluster_properties(properties, zoom_level)
            
            if clusters:
                # Return clustered data
                response_data = []
                for cluster in clusters:
                    if cluster['count'] > 1:
                        # Return cluster
                        response_data.append({
                            'type': 'cluster',
                            'latitude': cluster['latitude'],
                            'longitude': cluster['longitude'],
                            'count': cluster['count'],
                            'avg_rent': cluster.get('avg_rent'),
                            'min_rent': cluster.get('min_rent'),
                            'max_rent': cluster.get('max_rent')
                        })
                    else:
                        # Return single property
                        prop = cluster['properties'][0]
                        first_image = prop.images.first()
                        image_url = first_image.image.url if first_image else None
                        
                        response_data.append({
                            'type': 'property',
                            'id': prop.id,
                            'latitude': float(prop.latitude),
                            'longitude': float(prop.longitude),
                            'title': prop.title,
                            'rent_monthly': prop.rent_monthly,
                            'bedrooms': prop.bedrooms,
                            'bathrooms': prop.bathrooms,
                            'property_type': prop.property_type,
                            'address': prop.full_address,
                            'image_url': image_url,
                            'is_available': prop.is_active,
                            'ber_rating': prop.ber_rating,
                            'furnished': prop.furnished
                        })
                
                return Response({
                    'markers': response_data,
                    'total_count': len(properties),
                    'clustered': True,
                    'zoom_level': zoom_level,
                    'bounds': {
                        'north': north,
                        'south': south,
                        'east': east,
                        'west': west
                    } if all([north, south, east, west]) else None
                })
        
        # Return unclustered data
        properties_data = []
        for prop in properties:
            # Get first image if available
            first_image = prop.images.first()
            image_url = first_image.image.url if first_image else None
            
            properties_data.append({
                'type': 'property',
                'id': prop.id,
                'latitude': float(prop.latitude),
                'longitude': float(prop.longitude),
                'title': prop.title,
                'rent_monthly': prop.rent_monthly,
                'bedrooms': prop.bedrooms,
                'bathrooms': prop.bathrooms,
                'property_type': prop.property_type,
                'address': prop.full_address,
                'image_url': image_url,
                'is_available': prop.is_active,
                'ber_rating': prop.ber_rating,
                'furnished': prop.furnished
            })
        
        return Response({
            'markers': properties_data,
            'total_count': len(properties_data),
            'clustered': False,
            'zoom_level': zoom_level,
            'bounds': {
                'north': north,
                'south': south,
                'east': east,
                'west': west
            } if all([north, south, east, west]) else None
        })

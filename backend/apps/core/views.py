from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
import django_filters

from .models import County, Town, Property, Landlord, PropertyImage
from .serializers import (
    CountySerializer, TownSerializer, PropertyListSerializer,
    PropertyDetailSerializer, PropertyCreateSerializer, PropertyEnquirySerializer,
    PropertyImageSerializer
)


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

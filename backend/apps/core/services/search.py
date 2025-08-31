"""
Property Search Engine with advanced ranking algorithm
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from django.db.models import Q, F, Count, Avg, Min, Max, FloatField, Value, Case, When
from django.db.models.functions import Cast
from django.utils import timezone
from decimal import Decimal
import math

from apps.core.models import Property, PropertySearchQuery


class PropertySearchEngine:
    """Advanced property search with ranking and scoring"""
    
    def __init__(self):
        self.weights = {
            'quality': 0.25,      # Listing completeness, photos, description
            'popularity': 0.20,   # Views, saves, enquiries
            'price': 0.15,        # Price competitiveness
            'freshness': 0.20,    # How recently listed/updated
            'relevance': 0.20,    # Search term relevance
        }
    
    def search(self, 
               search_term: Optional[str] = None,
               filters: Optional[Dict] = None,
               user=None) -> Tuple[List[Property], Dict]:
        """
        Main search method with ranking
        Returns: (results, metadata)
        """
        # Start with base queryset
        queryset = Property.objects.filter(is_active=True)
        
        # Apply filters
        if filters:
            queryset = self._apply_filters(queryset, filters)
        
        # Apply search term
        relevance_score = 0
        if search_term:
            queryset, relevance_score = self._apply_search_term(queryset, search_term)
        
        # Calculate scores for ranking
        queryset = self._calculate_scores(queryset, filters, relevance_score)
        
        # Order by combined score
        queryset = queryset.order_by('-combined_score', '-created_at')
        
        # Track search query for analytics
        if search_term or filters:
            self._track_search(search_term, filters, queryset.count(), user)
        
        # Generate metadata
        metadata = self._generate_metadata(queryset, filters)
        
        return queryset, metadata
    
    def _apply_filters(self, queryset, filters: Dict):
        """Apply filter parameters to queryset"""
        # Location filters
        if filters.get('county'):
            queryset = queryset.filter(county__slug__iexact=filters['county'])
        if filters.get('town'):
            queryset = queryset.filter(town__slug__iexact=filters['town'])
        
        # Property type and features
        if filters.get('property_type'):
            queryset = queryset.filter(property_type=filters['property_type'])
        if filters.get('bedrooms'):
            queryset = queryset.filter(bedrooms=filters['bedrooms'])
        if filters.get('bedrooms_min'):
            queryset = queryset.filter(bedrooms__gte=filters['bedrooms_min'])
        if filters.get('bedrooms_max'):
            queryset = queryset.filter(bedrooms__lte=filters['bedrooms_max'])
        
        # Price range
        if filters.get('rent_min'):
            queryset = queryset.filter(rent_monthly__gte=filters['rent_min'])
        if filters.get('rent_max'):
            queryset = queryset.filter(rent_monthly__lte=filters['rent_max'])
        
        # Property attributes
        if filters.get('ber_rating'):
            queryset = queryset.filter(ber_rating=filters['ber_rating'])
        if filters.get('furnished'):
            queryset = queryset.filter(furnished=filters['furnished'])
        
        # New advanced filters
        if filters.get('lease_duration_type'):
            queryset = queryset.filter(lease_duration_type=filters['lease_duration_type'])
        if filters.get('available_from'):
            queryset = queryset.filter(available_from__gte=filters['available_from'])
        if filters.get('available_to'):
            queryset = queryset.filter(available_to__lte=filters['available_to'])
        if filters.get('pet_friendly') is not None:
            queryset = queryset.filter(pet_friendly=filters['pet_friendly'])
        if filters.get('parking_type'):
            if filters['parking_type'] != 'none':
                queryset = queryset.filter(parking_type=filters['parking_type'])
        if filters.get('outdoor_space'):
            if filters['outdoor_space'] != 'none':
                queryset = queryset.filter(outdoor_space=filters['outdoor_space'])
        if filters.get('bills_included') is not None:
            queryset = queryset.filter(bills_included=filters['bills_included'])
        if filters.get('viewing_type'):
            queryset = queryset.filter(viewing_type=filters['viewing_type'])
        
        return queryset
    
    def _apply_search_term(self, queryset, search_term: str):
        """Apply text search and calculate relevance"""
        # Basic text search across multiple fields
        search_query = Q(title__icontains=search_term) | \
                      Q(description__icontains=search_term) | \
                      Q(town__name__icontains=search_term) | \
                      Q(county__name__icontains=search_term) | \
                      Q(address__icontains=search_term) | \
                      Q(eircode__icontains=search_term)
        
        queryset = queryset.filter(search_query)
        
        # Calculate basic relevance score (would be more sophisticated with PostgreSQL full-text search)
        relevance_score = 1.0  # Base relevance for matching
        
        return queryset, relevance_score
    
    def _calculate_scores(self, queryset, filters: Optional[Dict], relevance_score: float):
        """Calculate individual scores and combine them"""
        # Quality Score
        queryset = self._calculate_quality_score(queryset)
        
        # Popularity Score
        queryset = self._calculate_popularity_score(queryset)
        
        # Price Competitiveness Score
        queryset = self._calculate_price_score(queryset, filters)
        
        # Freshness Score
        queryset = self._calculate_freshness_score(queryset)
        
        # Combine all scores
        queryset = queryset.annotate(
            combined_score=Cast(
                F('quality_score') * self.weights['quality'] +
                F('popularity_score') * self.weights['popularity'] +
                F('price_score') * self.weights['price'] +
                F('freshness_score') * self.weights['freshness'] +
                Value(relevance_score * self.weights['relevance']),
                output_field=FloatField()
            )
        )
        
        return queryset
    
    def _calculate_quality_score(self, queryset):
        """Score based on listing completeness and quality"""
        return queryset.annotate(
            has_description=Case(
                When(description__isnull=False, description__gt='', then=1),
                default=0,
                output_field=FloatField()
            ),
            has_eircode=Case(
                When(eircode__isnull=False, eircode__gt='', then=1),
                default=0,
                output_field=FloatField()
            ),
            has_ber=Case(
                When(ber_rating__isnull=False, ber_rating__gt='', then=1),
                default=0,
                output_field=FloatField()
            ),
            has_floor_area=Case(
                When(floor_area__isnull=False, then=1),
                default=0,
                output_field=FloatField()
            ),
            quality_score=Cast(
                (F('has_description') + F('has_eircode') + F('has_ber') + F('has_floor_area')) / 4.0,
                output_field=FloatField()
            )
        )
    
    def _calculate_popularity_score(self, queryset):
        """Score based on user engagement"""
        # Get max values for normalization
        max_views = queryset.aggregate(max_v=Max('view_count'))['max_v'] or 1
        max_enquiries = queryset.aggregate(max_e=Max('enquiry_count'))['max_e'] or 1
        
        return queryset.annotate(
            normalized_views=Cast(F('view_count'), FloatField()) / max_views,
            normalized_enquiries=Cast(F('enquiry_count'), FloatField()) / max_enquiries,
            popularity_score=(F('normalized_views') * 0.4 + F('normalized_enquiries') * 0.6)
        )
    
    def _calculate_price_score(self, queryset, filters: Optional[Dict]):
        """Score based on price competitiveness"""
        if not filters:
            filters = {}
        
        # Get average price for similar properties
        avg_filters = {}
        if filters.get('bedrooms'):
            avg_filters['bedrooms'] = filters['bedrooms']
        if filters.get('property_type'):
            avg_filters['property_type'] = filters['property_type']
        
        if avg_filters:
            avg_price = Property.objects.filter(
                is_active=True, **avg_filters
            ).aggregate(avg=Avg('rent_monthly'))['avg']
        else:
            avg_price = queryset.aggregate(avg=Avg('rent_monthly'))['avg']
        
        if not avg_price:
            avg_price = Decimal('1500')  # Default average
        
        # Score properties closer to or below average higher
        return queryset.annotate(
            price_diff=Cast(F('rent_monthly') - avg_price, FloatField()),
            price_score=Case(
                When(price_diff__lte=0, then=1.0),  # Below average = full score
                When(price_diff__gt=0, then=Cast(
                    1.0 - (F('price_diff') / avg_price),
                    output_field=FloatField()
                )),
                default=0.5,
                output_field=FloatField()
            )
        )
    
    def _calculate_freshness_score(self, queryset):
        """Score based on how recently the property was listed or updated"""
        now = timezone.now()
        
        # Score decay over 30 days
        return queryset.annotate(
            days_since_update=Cast(
                (now - F('updated_at')).total_seconds() / 86400,
                output_field=FloatField()
            ),
            freshness_score=Case(
                When(days_since_update__lte=1, then=1.0),
                When(days_since_update__lte=7, then=0.9),
                When(days_since_update__lte=14, then=0.7),
                When(days_since_update__lte=30, then=0.5),
                When(days_since_update__lte=60, then=0.3),
                default=0.1,
                output_field=FloatField()
            )
        )
    
    def _track_search(self, search_term: Optional[str], filters: Optional[Dict], 
                     results_count: int, user=None):
        """Track search query for analytics"""
        PropertySearchQuery.objects.create(
            query=search_term or '',
            filters=filters or {},
            results_count=results_count,
            user=user if user and user.is_authenticated else None
        )
    
    def _generate_metadata(self, queryset, filters: Optional[Dict]) -> Dict:
        """Generate search metadata for faceted search"""
        metadata = {
            'total_results': queryset.count(),
            'price_range': queryset.aggregate(
                min_price=Min('rent_monthly'),
                max_price=Max('rent_monthly'),
                avg_price=Avg('rent_monthly')
            ),
            'facets': {}
        }
        
        # Generate facet counts if not filtered
        if not filters or 'property_type' not in filters:
            metadata['facets']['property_types'] = list(
                queryset.values('property_type').annotate(count=Count('id'))
            )
        
        if not filters or 'bedrooms' not in filters:
            metadata['facets']['bedrooms'] = list(
                queryset.values('bedrooms').annotate(count=Count('id')).order_by('bedrooms')
            )
        
        if not filters or 'furnished' not in filters:
            metadata['facets']['furnished'] = list(
                queryset.values('furnished').annotate(count=Count('id'))
            )
        
        return metadata
    
    def get_similar_properties(self, property_id: str, limit: int = 6) -> List[Property]:
        """Find similar properties based on attributes"""
        try:
            property_obj = Property.objects.get(id=property_id, is_active=True)
        except Property.DoesNotExist:
            return []
        
        # Find similar properties with weighted attributes
        similar = Property.objects.filter(
            is_active=True
        ).exclude(
            id=property_id
        ).filter(
            # Same county or town
            Q(county=property_obj.county) | Q(town=property_obj.town),
            # Similar price range (±20%)
            rent_monthly__gte=property_obj.rent_monthly * Decimal('0.8'),
            rent_monthly__lte=property_obj.rent_monthly * Decimal('1.2'),
            # Same or similar property type
            property_type=property_obj.property_type
        ).annotate(
            # Calculate similarity score
            location_match=Case(
                When(town=property_obj.town, then=2),
                When(county=property_obj.county, then=1),
                default=0,
                output_field=FloatField()
            ),
            bedroom_diff=Cast(
                abs(F('bedrooms') - property_obj.bedrooms),
                output_field=FloatField()
            ),
            price_diff=Cast(
                abs(F('rent_monthly') - property_obj.rent_monthly) / property_obj.rent_monthly,
                output_field=FloatField()
            ),
            similarity_score=F('location_match') * 0.4 - F('bedroom_diff') * 0.3 - F('price_diff') * 0.3
        ).order_by('-similarity_score')[:limit]
        
        return similar
    
    def get_search_suggestions(self, partial_query: str, limit: int = 10) -> List[str]:
        """Get search suggestions based on partial query"""
        suggestions = []
        
        # Get recent successful searches
        recent_searches = PropertySearchQuery.objects.filter(
            query__icontains=partial_query,
            results_count__gt=0
        ).values_list('query', flat=True).distinct()[:limit//2]
        
        suggestions.extend(recent_searches)
        
        # Get location suggestions
        from apps.core.models import Town, County
        
        towns = Town.objects.filter(
            name__icontains=partial_query
        ).values_list('name', flat=True)[:limit//2]
        
        counties = County.objects.filter(
            name__icontains=partial_query
        ).values_list('name', flat=True)[:limit//2]
        
        suggestions.extend(towns)
        suggestions.extend(counties)
        
        # Remove duplicates and limit
        seen = set()
        unique_suggestions = []
        for s in suggestions:
            if s not in seen:
                seen.add(s)
                unique_suggestions.append(s)
                if len(unique_suggestions) >= limit:
                    break
        
        return unique_suggestions
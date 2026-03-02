"""
Cache utility module for property listings and common data.

Provides caching decorators and utility functions for optimizing
database queries and API responses.
"""
from django.core.cache import cache
from django.conf import settings
from functools import wraps
import hashlib
import json


# Cache key prefixes
CACHE_KEY_PREFIX = 'mygafflist'
PROPERTY_LIST_KEY = f'{CACHE_KEY_PREFIX}:properties'
COUNTY_LIST_KEY = f'{CACHE_KEY_PREFIX}:counties'
TOWN_LIST_KEY = f'{CACHE_KEY_PREFIX}:towns'
FILTER_OPTIONS_KEY = f'{CACHE_KEY_PREFIX}:filter_options'


def get_cache_ttl(level='short'):
    """Get cache TTL based on level"""
    ttl_map = {
        'short': getattr(settings, 'CACHE_TTL_SHORT', 300),      # 5 minutes
        'medium': getattr(settings, 'CACHE_TTL_MEDIUM', 1800),   # 30 minutes
        'long': getattr(settings, 'CACHE_TTL_LONG', 86400),      # 24 hours
    }
    return ttl_map.get(level, 300)


def make_cache_key(prefix, *args, **kwargs):
    """Generate a deterministic cache key from arguments"""
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()) if v is not None)
    key_data = ':'.join(key_parts)
    key_hash = hashlib.md5(key_data.encode()).hexdigest()[:12]
    return f"{prefix}:{key_hash}"


def cached_property_list(timeout=None, key_prefix=None):
    """
    Cache decorator for property listings.
    
    Usage:
        @cached_property_list(timeout=300)
        def get_properties(filters):
            return Property.objects.filter(**filters)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Use provided timeout or default short TTL
            cache_timeout = timeout or get_cache_ttl('short')
            
            # Generate cache key from function name and arguments
            prefix = key_prefix or f"{PROPERTY_LIST_KEY}:{func.__name__}"
            cache_key = make_cache_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, cache_timeout)
            return result
        return wrapper
    return decorator


def cached_view(timeout=None, key_func=None):
    """
    Cache decorator for view methods.
    
    Usage:
        @cached_view(timeout=300)
        def list(self, request):
            return Response(...)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            cache_timeout = timeout or get_cache_ttl('short')
            
            # Generate cache key from request path and query params
            if key_func:
                cache_key = key_func(request, *args, **kwargs)
            else:
                query_str = request.GET.urlencode()
                cache_key = make_cache_key(
                    f"{PROPERTY_LIST_KEY}:view",
                    request.path,
                    query_str
                )
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(self, request, *args, **kwargs)
            cache.set(cache_key, result, cache_timeout)
            return result
        return wrapper
    return decorator


def invalidate_property_cache(property_id=None):
    """
    Clear property-related caches.
    
    If property_id is provided, only clears caches related to that property.
    Otherwise, clears all property caches.
    """
    try:
        if property_id:
            # Clear specific property cache
            cache.delete(f"{PROPERTY_LIST_KEY}:detail:{property_id}")
        
        # Clear all property list caches
        # Note: delete_pattern requires django-redis backend
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(f"{PROPERTY_LIST_KEY}:*")
        else:
            # Fallback: clear specific known keys
            cache.delete_many([
                f"{PROPERTY_LIST_KEY}:list",
                f"{FILTER_OPTIONS_KEY}",
            ])
    except Exception as e:
        # Log error but don't fail
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to invalidate property cache: {e}")


def invalidate_location_cache():
    """Clear location-related caches (counties and towns)"""
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(f"{COUNTY_LIST_KEY}:*")
            cache.delete_pattern(f"{TOWN_LIST_KEY}:*")
        else:
            cache.delete(COUNTY_LIST_KEY)
            cache.delete(TOWN_LIST_KEY)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to invalidate location cache: {e}")


def get_cached_counties():
    """Get counties with caching"""
    from .models import County
    
    cache_key = f"{COUNTY_LIST_KEY}:all"
    result = cache.get(cache_key)
    
    if result is None:
        result = list(County.objects.prefetch_related('towns').order_by('name'))
        cache.set(cache_key, result, get_cache_ttl('long'))
    
    return result


def get_cached_towns(county_slug=None):
    """Get towns with caching, optionally filtered by county"""
    from .models import Town
    
    cache_key = make_cache_key(TOWN_LIST_KEY, county=county_slug)
    result = cache.get(cache_key)
    
    if result is None:
        queryset = Town.objects.select_related('county').order_by('name')
        if county_slug:
            queryset = queryset.filter(county__slug=county_slug)
        result = list(queryset)
        cache.set(cache_key, result, get_cache_ttl('long'))
    
    return result


def get_cached_filter_options():
    """Get filter options with caching"""
    from .models import Property
    
    result = cache.get(FILTER_OPTIONS_KEY)
    
    if result is None:
        result = {
            'property_types': [{'value': k, 'label': v} for k, v in Property.PROPERTY_TYPES],
            'house_types': [{'value': k, 'label': v} for k, v in Property.HOUSE_TYPES],
            'ber_ratings': [{'value': k, 'label': v} for k, v in Property.BER_RATINGS],
            'furnished_options': [{'value': k, 'label': v} for k, v in Property.FURNISHED_CHOICES],
            'lease_duration_types': [{'value': k, 'label': v} for k, v in Property.LEASE_DURATION_TYPES],
            'parking_types': [{'value': k, 'label': v} for k, v in Property.PARKING_TYPES],
            'outdoor_space_types': [{'value': k, 'label': v} for k, v in Property.OUTDOOR_SPACE_TYPES],
            'viewing_types': [{'value': k, 'label': v} for k, v in Property.VIEWING_TYPES],
            'bedroom_options': [{'value': i, 'label': f"{i} bed{'s' if i != 1 else ''}"} for i in range(1, 6)],
            'price_ranges': [
                {'value': '0-1000', 'label': 'Up to €1,000'},
                {'value': '1000-1500', 'label': '€1,000 - €1,500'},
                {'value': '1500-2000', 'label': '€1,500 - €2,000'},
                {'value': '2000-2500', 'label': '€2,000 - €2,500'},
                {'value': '2500-3000', 'label': '€2,500 - €3,000'},
                {'value': '3000-99999', 'label': '€3,000+'},
            ]
        }
        cache.set(FILTER_OPTIONS_KEY, result, get_cache_ttl('long'))
    
    return result

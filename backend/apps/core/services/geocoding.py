"""
Geocoding service for Irish Eircodes using HERE Maps API with Google Maps fallback
"""
import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from geopy.geocoders import HereV7, GoogleV3
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import googlemaps

logger = logging.getLogger(__name__)


class IrelandGeocoder:
    """
    Geocoding service using HERE Maps API (primary) and Google Maps (fallback)
    Provides accurate geocoding for Irish Eircodes and addresses
    """
    
    def __init__(self):
        self.here_api_key = getattr(settings, 'HERE_API_KEY', None)
        self.google_api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        self.cache_timeout = 60 * 60 * 24 * 30  # 30 days
        
        # Initialize geocoders
        self.here_geocoder = None
        self.google_geocoder = None
        self.gmaps_client = None
        
        if self.here_api_key:
            try:
                self.here_geocoder = HereV7(apikey=self.here_api_key)
                logger.info("HERE Maps geocoder initialized")
            except Exception as e:
                logger.error(f"Failed to initialize HERE geocoder: {e}")
        
        if self.google_api_key:
            try:
                self.google_geocoder = GoogleV3(api_key=self.google_api_key)
                self.gmaps_client = googlemaps.Client(key=self.google_api_key)
                logger.info("Google Maps geocoder initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Google geocoder: {e}")
        
        if not self.here_geocoder and not self.google_geocoder:
            logger.warning("No geocoding service available. Please configure HERE_API_KEY or GOOGLE_MAPS_API_KEY")
    
    def _get_cache_key(self, query: str) -> str:
        """Generate cache key for query"""
        clean_query = query.upper().replace(' ', '')
        return f'geocode:ireland:{clean_query}'
    
    def _format_eircode(self, eircode: str) -> str:
        """Format eircode to standard format (e.g., 'D02 XH98')"""
        if not eircode:
            return eircode
        
        # Remove spaces and convert to uppercase
        clean_eircode = eircode.upper().replace(' ', '')
        
        # Check if it's a valid length (7 characters)
        if len(clean_eircode) == 7:
            # Format as XXX XXXX
            return f"{clean_eircode[:3]} {clean_eircode[3:]}"
        
        return eircode.upper()
    
    def _geocode_with_here(self, query: str) -> Optional[Dict[str, Any]]:
        """Geocode using HERE Maps API"""
        if not self.here_geocoder:
            return None
        
        try:
            # For Eircodes, add country hint
            if len(query.replace(' ', '')) == 7:
                query = f"{query}, Ireland"
            
            location = self.here_geocoder.geocode(query)
            
            if location:
                return {
                    'latitude': Decimal(str(location.latitude)),
                    'longitude': Decimal(str(location.longitude)),
                    'formatted_address': location.address,
                    'raw_response': location.raw,
                    'source': 'HERE',
                    'geocoded_at': timezone.now().isoformat()
                }
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"HERE geocoding error for '{query}': {e}")
        except Exception as e:
            logger.error(f"Unexpected HERE geocoding error for '{query}': {e}")
        
        return None
    
    def _geocode_with_google(self, query: str) -> Optional[Dict[str, Any]]:
        """Geocode using Google Maps API"""
        if not self.gmaps_client:
            return None
        
        try:
            # For Eircodes, add country component
            components = None
            if len(query.replace(' ', '')) == 7:
                components = {'country': 'IE'}
            
            result = self.gmaps_client.geocode(query, components=components)
            
            if result and len(result) > 0:
                location = result[0]
                geometry = location.get('geometry', {}).get('location', {})
                
                if 'lat' in geometry and 'lng' in geometry:
                    return {
                        'latitude': Decimal(str(geometry['lat'])),
                        'longitude': Decimal(str(geometry['lng'])),
                        'formatted_address': location.get('formatted_address', ''),
                        'raw_response': location,
                        'source': 'Google',
                        'geocoded_at': timezone.now().isoformat()
                    }
        except Exception as e:
            logger.error(f"Google geocoding error for '{query}': {e}")
        
        return None
    
    def geocode_eircode(self, eircode: str) -> Optional[Dict[str, Any]]:
        """
        Geocode an Irish Eircode to get coordinates
        
        Args:
            eircode: Irish postcode (e.g., 'D02 XH98')
            
        Returns:
            Dict with latitude, longitude, and formatted address or None
        """
        if not eircode:
            return None
        
        # Check if it's a placeholder eircode
        if '0000' in eircode:
            logger.debug(f"Skipping placeholder eircode: {eircode}")
            return None
        
        # Format the eircode
        formatted_eircode = self._format_eircode(eircode)
        
        # Check cache first
        cache_key = self._get_cache_key(formatted_eircode)
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.debug(f"Using cached result for eircode: {formatted_eircode}")
            return cached_result
        
        # Try HERE first
        result = self._geocode_with_here(formatted_eircode)
        
        # If HERE fails, try Google as fallback
        if not result and self.google_api_key:
            logger.info(f"HERE geocoding failed for {formatted_eircode}, trying Google")
            result = self._geocode_with_google(formatted_eircode)
        
        # Cache successful results
        if result:
            cache.set(cache_key, result, self.cache_timeout)
            logger.info(f"Successfully geocoded eircode {formatted_eircode} using {result['source']}")
        else:
            logger.warning(f"Failed to geocode eircode: {formatted_eircode}")
        
        return result
    
    def geocode_address(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Geocode a full address to get coordinates
        
        Args:
            address: Full address string
            
        Returns:
            Dict with latitude, longitude, and formatted address or None
        """
        if not address:
            return None
        
        # Check cache first
        cache_key = self._get_cache_key(address)
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.debug(f"Using cached result for address: {address}")
            return cached_result
        
        # Try HERE first
        result = self._geocode_with_here(address)
        
        # If HERE fails, try Google as fallback
        if not result and self.google_api_key:
            logger.info(f"HERE geocoding failed for address, trying Google")
            result = self._geocode_with_google(address)
        
        # Cache successful results
        if result:
            cache.set(cache_key, result, self.cache_timeout)
            logger.info(f"Successfully geocoded address using {result['source']}")
        else:
            logger.warning(f"Failed to geocode address: {address}")
        
        return result
    
    def batch_geocode(self, queries: list) -> Dict[str, Optional[Dict]]:
        """
        Geocode multiple addresses or eircodes
        
        Args:
            queries: List of addresses or eircodes to geocode
            
        Returns:
            Dict mapping queries to geocoding results
        """
        results = {}
        
        for query in queries:
            # Determine if it's an eircode or address
            if len(query.replace(' ', '')) == 7 and not any(char.isdigit() for char in query[:3]):
                result = self.geocode_eircode(query)
            else:
                result = self.geocode_address(query)
            
            results[query] = result
            
            # Add small delay to respect rate limits
            import time
            time.sleep(0.1)
        
        return results


# Singleton instance
geocoder = IrelandGeocoder()


def geocode_property(property_instance):
    """
    Geocode a property using its eircode or address
    
    Args:
        property_instance: Property model instance
        
    Returns:
        True if geocoding successful and property updated, False otherwise
    """
    result = None
    
    # Try eircode first if available
    if property_instance.eircode:
        result = geocoder.geocode_eircode(property_instance.eircode)
    
    # If no eircode or eircode geocoding failed, try full address
    if not result:
        # Build address from property fields
        address_parts = []
        
        if property_instance.address:
            address_parts.append(property_instance.address)
        
        if property_instance.town:
            address_parts.append(str(property_instance.town))
        
        if property_instance.county:
            address_parts.append(str(property_instance.county))
        
        if address_parts:
            full_address = ', '.join(address_parts) + ', Ireland'
            result = geocoder.geocode_address(full_address)
    
    # Update property with coordinates if successful
    if result:
        property_instance.latitude = result['latitude']
        property_instance.longitude = result['longitude']
        property_instance.save(update_fields=['latitude', 'longitude'])
        return True
    
    return False
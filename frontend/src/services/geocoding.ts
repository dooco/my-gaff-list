interface GeocodingResult {
  lat: number;
  lng: number;
  display_name?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface CachedResult extends GeocodingResult {
  timestamp: number;
}

const CACHE_KEY = 'geocoding_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

const getCache = (): Record<string, CachedResult> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const setCache = (key: string, result: GeocodingResult): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const cache = getCache();
    const now = Date.now();
    
    // Clean old entries
    Object.keys(cache).forEach(k => {
      if (now - cache[k].timestamp > CACHE_DURATION) {
        delete cache[k];
      }
    });
    
    cache[key] = { ...result, timestamp: now };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
};

const formatEircodeForGeocoding = (eircode: string): string => {
  // Remove spaces and format consistently
  const clean = eircode.toUpperCase().replace(/\s+/g, '');
  
  // Add space in standard position (3 chars + space + 4 chars)
  if (clean.length === 7) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  
  return eircode;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const geocodeEircode = async (
  eircode: string,
  town?: string,
  county?: string
): Promise<GeocodingResult | null> => {
  if (!eircode) return null;
  
  // Check if eircode looks like a placeholder (ends with 0000 or similar)
  const isPlaceholderEircode = /[A-Z]\d{2}\s?0{4}$/i.test(eircode);
  
  // Don't geocode placeholder eircodes
  if (isPlaceholderEircode) {
    return null;
  }
  
  const formattedEircode = formatEircodeForGeocoding(eircode);
  const cacheKey = `eircode:${formattedEircode}`;
  
  // Check cache first
  const cache = getCache();
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey];
  }
  
  try {
    // ONLY try geocoding with the eircode - no fallback to town/county
    const params = new URLSearchParams({
      q: `${formattedEircode}, Ireland`,
      format: 'json',
      limit: '1',
      countrycodes: 'ie',
      addressdetails: '1'
    });
    
    const response = await fetch(`${NOMINATIM_BASE_URL}?${params}`, {
      headers: {
        'User-Agent': 'MyGaffList/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result: GeocodingResult = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name,
          confidence: 'high'
        };
        
        setCache(cacheKey, result);
        return result;
      }
    }
    
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  
  return null;
};

// Irish county coordinates for fallback
const COUNTY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'dublin': { lat: 53.3498, lng: -6.2603 },
  'cork': { lat: 51.8985, lng: -8.4756 },
  'galway': { lat: 53.2707, lng: -9.0568 },
  'limerick': { lat: 52.6638, lng: -8.6267 },
  'waterford': { lat: 52.2593, lng: -7.1101 },
  'clare': { lat: 52.8917, lng: -8.9889 },
  'kerry': { lat: 52.1545, lng: -9.5669 },
  'mayo': { lat: 53.8540, lng: -9.2988 },
  'sligo': { lat: 54.2766, lng: -8.4761 },
  'donegal': { lat: 54.6533, lng: -8.1095 },
  'leitrim': { lat: 54.1247, lng: -8.0019 },
  'roscommon': { lat: 53.7595, lng: -8.2679 },
  'longford': { lat: 53.7276, lng: -7.7932 },
  'westmeath': { lat: 53.5345, lng: -7.4653 },
  'meath': { lat: 53.6055, lng: -6.6562 },
  'louth': { lat: 53.9234, lng: -6.4851 },
  'monaghan': { lat: 54.2492, lng: -6.9683 },
  'cavan': { lat: 53.9908, lng: -7.3606 },
  'wicklow': { lat: 52.9808, lng: -6.0449 },
  'kildare': { lat: 53.1589, lng: -6.9097 },
  'laois': { lat: 52.9943, lng: -7.3324 },
  'offaly': { lat: 53.2380, lng: -7.7130 },
  'kilkenny': { lat: 52.6541, lng: -7.2448 },
  'carlow': { lat: 52.8408, lng: -6.9261 },
  'wexford': { lat: 52.3369, lng: -6.4633 },
  'tipperary': { lat: 52.4736, lng: -8.1619 }
};

export const getCountyCoordinates = (county: string): GeocodingResult | null => {
  const normalizedCounty = county.toLowerCase().replace(/^co\.?\s*/i, '').trim();
  const coords = COUNTY_COORDINATES[normalizedCounty];
  
  if (coords) {
    return {
      ...coords,
      confidence: 'low',
      display_name: `County ${county}, Ireland`
    };
  }
  
  return null;
};

export const geocodeAddress = async (
  address: string,
  county?: string
): Promise<GeocodingResult | null> => {
  const cacheKey = `address:${address}:${county || ''}`;
  const cache = getCache();
  
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }
  
  try {
    const query = county ? `${address}, County ${county}, Ireland` : `${address}, Ireland`;
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'ie'
    });
    
    const response = await fetch(`${NOMINATIM_BASE_URL}?${params}`, {
      headers: {
        'User-Agent': 'MyGaffList/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result: GeocodingResult = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name,
          confidence: 'high'
        };
        
        setCache(cacheKey, result);
        return result;
      }
    }
  } catch (error) {
    console.error('Address geocoding error:', error);
  }
  
  // Fallback to county coordinates
  if (county) {
    return getCountyCoordinates(county);
  }
  
  return null;
};
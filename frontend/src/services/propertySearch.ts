import axios from 'axios';
import { Property, PropertyFilters } from '@/types/property';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface SearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Property[];
  metadata?: {
    total_results: number;
    price_range: {
      min_price: number;
      max_price: number;
      avg_price: number;
    };
    facets: {
      property_types?: { property_type: string; count: number }[];
      bedrooms?: { bedrooms: number; count: number }[];
      furnished?: { furnished: string; count: number }[];
    };
  };
}

interface PriceAnalysis {
  filters: Record<string, string>;
  statistics: {
    avg_price: number;
    min_price: number;
    max_price: number;
    total_properties: number;
  };
  distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

class PropertySearchService {
  /**
   * Advanced property search with ranking and metadata
   */
  async searchProperties(filters: PropertyFilters): Promise<SearchResponse> {
    const params = new URLSearchParams();
    
    // Add all filters as query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const response = await axios.get<SearchResponse>(
      `${API_BASE_URL}/properties/search/`,
      { params }
    );
    
    return response.data;
  }
  
  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) {
      return [];
    }
    
    const response = await axios.get<{ suggestions: string[] }>(
      `${API_BASE_URL}/properties/search_suggestions/`,
      { params: { q: query } }
    );
    
    return response.data.suggestions;
  }
  
  /**
   * Get similar properties to a given property
   */
  async getSimilarProperties(propertyId: string, limit: number = 6): Promise<Property[]> {
    const response = await axios.get<Property[]>(
      `${API_BASE_URL}/properties/${propertyId}/similar/`,
      { params: { limit } }
    );
    
    return response.data;
  }
  
  /**
   * Get price analysis for an area and property type
   */
  async getPriceAnalysis(filters: {
    county?: string;
    town?: string;
    property_type?: string;
    bedrooms?: number;
  }): Promise<PriceAnalysis> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    
    const response = await axios.get<PriceAnalysis>(
      `${API_BASE_URL}/properties/price_analysis/`,
      { params }
    );
    
    return response.data;
  }
  
  /**
   * Track property view
   */
  async trackPropertyView(propertyId: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/properties/${propertyId}/track_view/`);
    } catch (error) {
      // Silently fail tracking
      console.error('Failed to track property view:', error);
    }
  }
}

export const propertySearchService = new PropertySearchService();
export type { SearchResponse, PriceAnalysis };
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Property, PropertyDetail, PropertyFilters, ApiResponse } from '@/types/property';

export const useProperties = (filters: PropertyFilters = {}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, v.toString()));
            } else {
              params.append(key, value.toString());
            }
          }
        });

        const response = await api.get<ApiResponse<Property>>(`/properties/?${params}`);
        setProperties(response.data.results);
        setTotalCount(response.data.count);
      } catch (err) {
        setError('Failed to fetch properties');
        console.error('Properties fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [filters]);

  return { properties, loading, error, totalCount };
};

export const useProperty = (id: string) => {
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<PropertyDetail>(`/properties/${id}/`);
        setProperty(response.data);
      } catch (err) {
        setError('Failed to fetch property details');
        console.error('Property fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  return { property, loading, error };
};

export const usePropertySearch = () => {
  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProperties = async (filters: PropertyFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await api.get<ApiResponse<Property>>(`/properties/search/?${params}`);
      setResults(response.data.results);
    } catch (err) {
      setError('Search failed');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, searchProperties };
};
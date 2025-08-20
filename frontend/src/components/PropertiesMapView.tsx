'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { HomeIcon, BuildingOfficeIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { api } from '@/services/api';
import Link from 'next/link';

// Dynamic import of map component to avoid SSR issues
const DynamicMap = dynamic(
  () => import('./PropertiesMapMultiple'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }
);

interface Property {
  type: 'property';
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  rent_monthly: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  address: string;
  image_url?: string;
  is_available: boolean;
  ber_rating?: string;
  furnished?: string;
}

interface PropertiesMapViewProps {
  initialFilters?: any;
  className?: string;
  height?: string;
}

export default function PropertiesMapView({ 
  initialFilters = {},
  className = '',
  height = '600px'
}: PropertiesMapViewProps) {
  const [markers, setMarkers] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      // Add filters
      Object.entries(initialFilters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });

      // Limit to properties with coordinates
      params.append('max_markers', '200');
      
      const response = await api.get(`/properties/map/?${params.toString()}`);
      
      // Filter to only property markers (not clusters for now)
      const properties = ((response as any).markers || []).filter(
        (m: any) => m.type === 'property'
      ) as Property[];
      
      setMarkers(properties);
    } catch (err) {
      console.error('Error loading properties:', err);
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-8 text-center ${className}`}>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadProperties}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading overlay */}
      {loading && markers.length === 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading properties...</p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
        <DynamicMap properties={markers} />
      </div>

      {/* Map info and stats */}
      {!loading && (
        <div className="mt-4 space-y-4">
          {markers.length > 0 ? (
            <>
              {/* Property count and legend */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="font-medium">
                  Showing {markers.length} properties on map
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <HomeIcon className="h-4 w-4 text-blue-600" />
                    House
                  </span>
                  <span className="flex items-center gap-1">
                    <BuildingOfficeIcon className="h-4 w-4 text-green-600" />
                    Apartment
                  </span>
                  <span className="flex items-center gap-1">
                    <BuildingOffice2Icon className="h-4 w-4 text-purple-600" />
                    Studio
                  </span>
                </div>
              </div>

              {/* Price range info */}
              {markers.length > 1 && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Price range:</span>
                    <span className="font-medium text-gray-900">
                      €{Math.min(...markers.map(m => m.rent_monthly))} - €{Math.max(...markers.map(m => m.rent_monthly))}/month
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <p className="text-yellow-800 font-medium">
                    No properties with location data found
                  </p>
                  <p className="text-yellow-700 mt-1">
                    Properties need valid coordinates to appear on the map. 
                    Try adjusting your filters or browse properties in grid view.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
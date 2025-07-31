'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface PropertyLocationMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  title: string;
  className?: string;
}

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
}

export default function PropertyLocationMap({
  latitude,
  longitude,
  address,
  title,
  className = ''
}: PropertyLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Mock coordinates for Irish cities if no coordinates provided
  const getMockCoordinates = (address?: string) => {
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'dublin': { lat: 53.3498, lng: -6.2603 },
      'cork': { lat: 51.8985, lng: -8.4756 },
      'galway': { lat: 53.2707, lng: -9.0568 },
      'waterford': { lat: 52.2593, lng: -7.1101 },
      'limerick': { lat: 52.6638, lng: -8.6267 },
      'kilkenny': { lat: 52.6541, lng: -7.2448 },
      'wexford': { lat: 52.3369, lng: -6.4633 },
      'sligo': { lat: 54.2766, lng: -8.4761 },
      'drogheda': { lat: 53.7190, lng: -6.3479 },
      'dundalk': { lat: 53.9618, lng: -6.4058 }
    };

    if (address) {
      const addressLower = address.toLowerCase();
      for (const [city, coords] of Object.entries(cityCoords)) {
        if (addressLower.includes(city)) {
          return coords;
        }
      }
    }

    // Default to Dublin if no match
    return cityCoords.dublin;
  };

  const coordinates = latitude && longitude 
    ? { lat: latitude, lng: longitude }
    : getMockCoordinates(address);

  const initializeMap = () => {
    if (!mapRef.current || !coordinates) return;

    try {
      // Create a simple static map using OpenStreetMap tiles
      const mapContainer = mapRef.current;
      mapContainer.innerHTML = `
        <div class="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.lng - 0.01},${coordinates.lat - 0.01},${coordinates.lng + 0.01},${coordinates.lat + 0.01}&layer=mapnik&marker=${coordinates.lat},${coordinates.lng}"
            width="100%"
            height="100%"
            frameborder="0"
            style="border: 0;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
          <div class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-700">
            📍 ${address || title}
          </div>
        </div>
      `;
      setMapLoaded(true);
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to load map');
    }
  };

  const handleShowMap = () => {
    if (!showMap) {
      setShowMap(true);
      setTimeout(initializeMap, 100);
    }
  };

  if (!coordinates) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <ExclamationTriangleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">Location information unavailable</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {!showMap ? (
        /* Map Preview/Placeholder */
        <div className="relative">
          <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPinIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Property Location</h3>
              <p className="text-sm text-gray-600 mb-4">
                {address || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`}
              </p>
              <button
                onClick={handleShowMap}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Show Map
              </button>
            </div>
          </div>
          
          {/* Approximate location notice */}
          <div className="p-4 bg-yellow-50 border-t border-yellow-200">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">Approximate Location</p>
                <p className="text-xs text-yellow-700 mt-1">
                  For privacy reasons, the exact address is only shared with verified enquiries.
                  The map shows the general area of the property.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Map */
        <div className="relative">
          {mapError ? (
            <div className="aspect-[16/9] bg-red-50 flex items-center justify-center">
              <div className="text-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 text-sm">{mapError}</p>
                <button
                  onClick={() => {
                    setMapError(null);
                    initializeMap();
                  }}
                  className="mt-2 text-red-600 hover:text-red-700 text-sm underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <div 
              ref={mapRef}
              className="aspect-[16/9] bg-gray-100"
            />
          )}
          
          {/* Location details */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Location Details</h4>
                <p className="text-sm text-gray-600">{address || 'Coordinates available'}</p>
              </div>
              <div className="text-xs text-gray-500">
                Lat: {coordinates.lat.toFixed(4)}, Lng: {coordinates.lng.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
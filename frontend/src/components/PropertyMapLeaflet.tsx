'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { geocodeEircode, getCountyCoordinates } from '@/services/geocoding';

// Dynamic import with custom loading component
const MapWithNoSSR = dynamic(
  () => import('./MapWithNoSSR'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    )
  }
);

interface PropertyMapLeafletProps {
  eircode?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  town?: string;
  county?: string;
  title: string;
  rent?: string;
  bedrooms?: number;
  className?: string;
}

type MapState = 
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; coordinates: [number, number]; confidence: 'high' | 'medium' | 'low' };

export default function PropertyMapLeaflet({
  eircode,
  latitude,
  longitude,
  address,
  town,
  county,
  title,
  rent,
  bedrooms,
  className = ''
}: PropertyMapLeafletProps) {
  const [mapState, setMapState] = useState<MapState>({ status: 'loading' });
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const getCoordinates = async () => {
      // Use coordinates from database if available
      if (latitude && longitude) {
        setMapState({
          status: 'ready',
          coordinates: [latitude, longitude],
          confidence: 'high'
        });
        return;
      }

      // If we have an eircode but no coordinates, show pending message
      if (eircode && !eircode.endsWith('0000')) {
        setMapState({
          status: 'error',
          message: 'Location coordinates pending - awaiting geocoding service'
        });
        return;
      }

      // No valid eircode or coordinates - don't show map
      setMapState({
        status: 'error',
        message: eircode ? 'Invalid Eircode format' : 'No Eircode provided for this property'
      });
    };

    getCoordinates();
  }, [eircode, latitude, longitude]);

  const handleShowMap = () => {
    setShowMap(true);
  };

  const getZoomLevel = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 16;
      case 'medium': return 13;
      case 'low': return 10;
      default: return 13;
    }
  };

  const getLocationAccuracyMessage = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'Showing approximate property location';
      case 'medium':
        return 'Showing general area - exact location available upon enquiry';
      case 'low':
        return 'Showing county center - contact for exact location';
      default:
        return 'Location shown is approximate';
    }
  };

  if (mapState.status === 'loading') {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (mapState.status === 'error') {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <ExclamationTriangleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">{mapState.message}</p>
      </div>
    );
  }

  const { coordinates, confidence } = mapState;

  if (!showMap) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
        <div className="relative">
          <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPinIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Property Location</h3>
              <p className="text-sm text-gray-600 mb-1">
                {address || (town && county ? `${town}, ${county}` : county || 'Ireland')}
              </p>
              {eircode && (
                <p className="text-xs text-gray-500 mb-4">
                  Eircode: {eircode}
                </p>
              )}
              <button
                onClick={handleShowMap}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                View on Map
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 border-t border-yellow-200">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  {getLocationAccuracyMessage(confidence)}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  For privacy and security, exact address details are provided after verified enquiry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="relative">
        <div className="aspect-[16/9] relative" style={{ height: '400px' }}>
          <MapWithNoSSR
            position={coordinates}
            zoom={getZoomLevel(confidence)}
            title={title}
            rent={rent}
            bedrooms={bedrooms}
            eircode={eircode}
          />
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Location Details</h4>
              <p className="text-sm text-gray-600">
                {address || (town && county ? `${town}, ${county}` : county || 'Ireland')}
              </p>
              {eircode && (
                <p className="text-xs text-gray-500 mt-1">Eircode: {eircode}</p>
              )}
            </div>
            <div className="text-xs text-gray-500">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                confidence === 'high' ? 'bg-green-100 text-green-800' :
                confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {confidence === 'high' ? 'Precise' :
                 confidence === 'medium' ? 'Approximate' :
                 'General Area'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
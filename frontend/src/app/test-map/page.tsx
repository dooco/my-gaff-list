'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const PropertiesMapView = dynamic(
  () => import('@/components/PropertiesMapView'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-100 animate-pulse flex items-center justify-center">
        <p>Loading map component...</p>
      </div>
    )
  }
);

export default function TestMapPage() {
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    // Delay to ensure client-side rendering
    const timer = setTimeout(() => setShowMap(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Map Test Page</h1>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm">This page tests the map component in isolation.</p>
        <p className="text-sm mt-2">Check the browser console for any errors.</p>
      </div>

      <div className="border-2 border-gray-300 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Map View Component:</h2>
        {showMap ? (
          <PropertiesMapView 
            height="500px"
            className="mt-4"
          />
        ) : (
          <div className="h-96 bg-gray-100 animate-pulse flex items-center justify-center">
            <p>Preparing map...</p>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <ul className="text-sm space-y-1">
          <li>API Endpoint: http://localhost:8000/api/properties/map/</li>
          <li>Frontend URL: http://localhost:3000/test-map</li>
          <li>Component mounted: {showMap ? 'Yes' : 'No'}</li>
        </ul>
      </div>
    </div>
  );
}
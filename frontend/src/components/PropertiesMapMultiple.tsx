'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

interface PropertyMarker {
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
}

interface PropertiesMapMultipleProps {
  properties: PropertyMarker[];
  center?: [number, number];
  zoom?: number;
}

export default function PropertiesMapMultiple({
  properties,
  center = [53.3498, -6.2603], // Ireland center
  zoom = 7
}: PropertiesMapMultipleProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    );
  }

  // Calculate center based on properties if they exist
  const mapCenter = properties.length > 0
    ? [
        properties.reduce((sum, p) => sum + p.latitude, 0) / properties.length,
        properties.reduce((sum, p) => sum + p.longitude, 0) / properties.length
      ] as [number, number]
    : center;

  // Adjust zoom based on number of properties
  const mapZoom = properties.length === 1 ? 14 : properties.length > 0 ? 10 : zoom;

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {properties.map((property) => (
        <Marker
          key={property.id}
          position={[property.latitude, property.longitude]}
        >
          <Popup>
            <div className="min-w-[200px]">
              {property.image_url && (
                <img 
                  src={`${API_BASE_URL}${property.image_url}`} 
                  alt={property.title}
                  className="w-full h-24 object-cover rounded-t mb-2"
                />
              )}
              <h3 className="font-semibold text-gray-900">{property.title}</h3>
              <p className="text-lg font-bold text-blue-600">€{property.rent_monthly}/month</p>
              <div className="text-sm text-gray-600 mt-1">
                <p>{property.bedrooms} bed • {property.bathrooms} bath</p>
                <p className="text-xs mt-1">{property.address}</p>
              </div>
              <Link
                href={`/property/${property.id}`}
                className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
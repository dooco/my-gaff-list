'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

interface MapWithNoSSRProps {
  position: [number, number];
  zoom: number;
  title: string;
  rent?: string;
  bedrooms?: number;
  eircode?: string;
}

export default function MapWithNoSSR({
  position,
  zoom,
  title,
  rent,
  bedrooms,
  eircode
}: MapWithNoSSRProps) {
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

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
      whenReady={(map) => {
        setTimeout(() => {
          map.target.invalidateSize();
        }, 100);
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>
          <div className="p-2">
            <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
            {rent && (
              <p className="text-sm text-gray-600">€{rent}/month</p>
            )}
            {bedrooms && (
              <p className="text-sm text-gray-600">{bedrooms} bedroom{bedrooms > 1 ? 's' : ''}</p>
            )}
            {eircode && (
              <p className="text-xs text-gray-500 mt-1">Eircode: {eircode}</p>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
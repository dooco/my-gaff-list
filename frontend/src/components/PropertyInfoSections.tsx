'use client';

import { PropertyDetail } from '@/types/property';
import BERBadge from './BERBadge';
import PropertyLocationMap from './PropertyLocationMap';
import { CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface PropertyInfoSectionsProps {
  property: PropertyDetail;
  className?: string;
}

export default function PropertyInfoSections({ property, className = '' }: PropertyInfoSectionsProps) {
  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getPropertyTypeDisplay = (type: string, houseType?: string) => {
    const typeMap: Record<string, string> = {
      apartment: 'Apartment',
      house: 'House',
      shared: 'Shared Accommodation',
      studio: 'Studio',
      townhouse: 'Townhouse'
    };

    const houseTypeMap: Record<string, string> = {
      terraced: 'Terraced',
      semi_detached: 'Semi-Detached',
      detached: 'Detached',
      bungalow: 'Bungalow'
    };

    let display = typeMap[type] || type;
    if (houseType && houseTypeMap[houseType]) {
      display = `${houseTypeMap[houseType]} ${display}`;
    }
    return display;
  };

  const formatFurnished = (furnished: string) => {
    const furnishedMap: Record<string, string> = {
      furnished: 'Furnished',
      unfurnished: 'Unfurnished',
      part_furnished: 'Part Furnished'
    };
    return furnishedMap[furnished] || furnished;
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Property Details */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
        
        {/* Additional details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Furnished</span>
            <span className="font-medium">{formatFurnished(property.furnished)}</span>
          </div>
          
          {property.floor_area && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Floor Area</span>
              <span className="font-medium">{property.floor_area}m²</span>
            </div>
          )}
          
          {property.deposit && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Deposit</span>
              <span className="font-medium">{formatPrice(property.deposit)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Description */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
        <div className="text-gray-700 leading-relaxed whitespace-pre-line">
          {property.description}
        </div>
      </section>

      {/* Property Features */}
      {property.features && property.features.length > 0 && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {property.features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 p-2 bg-green-50 text-green-800 rounded-lg text-sm"
              >
                <span className="text-green-600">✓</span>
                {feature}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Location & Availability */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Location & Availability</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-gray-600" />
              Location
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">County</span>
                <span className="font-medium">{property.county_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Town/City</span>
                <span className="font-medium">{property.town_name}</span>
              </div>
              {property.address && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Address</span>
                  <span className="font-medium">{property.address}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              Availability
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Available From</span>
                <span className="font-medium">{formatDate(property.available_from)}</span>
              </div>
              {property.lease_duration && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Lease Length</span>
                  <span className="font-medium">{property.lease_duration}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Location Map */}
      {property.latitude && property.longitude && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
          <PropertyLocationMap
            latitude={property.latitude}
            longitude={property.longitude}
            address={property.address || property.location_display}
            title={property.title}
          />
        </section>
      )}

      {/* Energy Rating */}
      {property.ber_rating && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Energy Rating</h2>
          <div className="flex items-center gap-4">
            <BERBadge rating={property.ber_rating} className="text-lg px-4 py-2" />
            <div>
              <div className="text-gray-700">Building Energy Rating (BER)</div>
              {property.ber_number && (
                <div className="text-sm text-gray-500">Certificate: {property.ber_number}</div>
              )}
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            The BER is an indication of the energy performance of a home. It covers energy use for space heating, water heating, ventilation and lighting, calculated on the basis of standard occupancy.
          </div>
        </section>
      )}
    </div>
  );
}
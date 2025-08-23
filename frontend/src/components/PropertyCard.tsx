import Image from 'next/image';
import { useState } from 'react';
import BERBadge from './BERBadge';
import VerificationBadge from './verification/VerificationBadge';
import { Property } from '@/types/property';
import { useAuth } from '@/hooks/useAuth';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface PropertyCardProps {
  property: Property;
  onSelect?: (property: Property) => void;
  className?: string;
}

const formatPrice = (price: string): string => {
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
};

const formatPropertyType = (type: string): string => {
  switch (type) {
    case 'apartment':
      return 'Apartment';
    case 'house':
      return 'House';
    case 'shared':
      return 'Shared';
    case 'studio':
      return 'Studio';
    case 'townhouse':
      return 'Townhouse';
    default:
      return type;
  }
};

const formatFurnished = (furnished: string | boolean): string => {
  // Handle boolean values or string representations of booleans
  if (furnished === false || furnished === 'False' || furnished === 'false') {
    return 'Unfurnished';
  }
  if (furnished === true || furnished === 'True' || furnished === 'true') {
    return 'Furnished';
  }
  
  // Handle proper string values
  switch (furnished) {
    case 'furnished':
      return 'Furnished';
    case 'unfurnished':
      return 'Unfurnished';
    case 'part_furnished':
      return 'Part Furnished';
    default:
      // If it's an unexpected value, don't display it
      return '';
  }
};

export default function PropertyCard({ property, onSelect, className = '' }: PropertyCardProps) {
  const { isAuthenticated } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const handleClick = () => {
    onSelect?.(property);
  };

  const handleSaveProperty = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      // Could show login modal here
      return;
    }

    setSaveLoading(true);
    try {
      // Mock API call - will be replaced with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Failed to save property:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md 
        transition-shadow duration-200 overflow-hidden cursor-pointer
        ${className}
      `}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-200">
        {property.main_image_url ? (
          <Image
            src={property.main_image_url}
            alt={property.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-400 text-sm">No image</div>
          </div>
        )}
        
        {/* BER Badge - Top Right */}
        {property.ber_rating && (
          <div className="absolute top-2 right-2">
            <BERBadge rating={property.ber_rating} size="sm" />
          </div>
        )}
        
        {/* Feature count - Top Left */}
        {property.features && property.features.length > 0 && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            {property.features.length} features
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Location */}
        <div className="text-sm text-gray-600 mb-1">
          {property.location_display}
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {property.title}
        </h3>
        
        {/* Landlord with Verification Badge */}
        {property.landlord && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">
              by {property.landlord.display_name || property.landlord.name}
            </span>
            {property.landlord.verification_level && property.landlord.verification_level !== 'none' && (
              <VerificationBadge 
                level={property.landlord.verification_level} 
                size="sm"
              />
            )}
          </div>
        )}
        
        {/* Property Details */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
          <span>{formatPropertyType(property.property_type)}</span>
          <span>•</span>
          <span>
            {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
          </span>
          <span>•</span>
          <span>
            {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
          </span>
        </div>
        
        {/* Features */}
        {property.features && property.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {property.features.slice(0, 3).map((feature, index) => (
              <span
                key={index}
                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
              >
                {feature}
              </span>
            ))}
            {property.features.length > 3 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{property.features.length - 3} more
              </span>
            )}
          </div>
        )}
        
        {/* Furnished Status */}
        {formatFurnished(property.furnished) && (
          <div className="text-sm text-gray-600 mb-3">
            {formatFurnished(property.furnished)}
          </div>
        )}
        
        {/* Price and Available Date */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-gray-900">
              {formatPrice(property.rent_monthly)}
              <span className="text-sm font-normal text-gray-600">/month</span>
            </div>
            <div className="text-sm text-gray-500">
              Available {new Date(property.available_from).toLocaleDateString('en-IE', {
                day: 'numeric',
                month: 'short'
              })}
            </div>
          </div>
          
          {/* Heart Icon - Save Property */}
          {isAuthenticated && (
            <button 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              onClick={handleSaveProperty}
              disabled={saveLoading}
              title={isSaved ? 'Remove from saved' : 'Save property'}
            >
              {saveLoading ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-500"></div>
              ) : isSaved ? (
                <HeartIconSolid className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-gray-400 hover:text-red-500" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
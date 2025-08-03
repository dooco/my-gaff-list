'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PropertyCard from './PropertyCard';
import { Property } from '@/types/property';
import { 
  ArrowRightIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

interface SimilarPropertiesProps {
  currentProperty: {
    id: string;
    property_type: string;
    bedrooms: number;
    county_name: string;
    town_name: string;
    rent_monthly: string;
  };
  className?: string;
}

export default function SimilarProperties({ currentProperty, className = '' }: SimilarPropertiesProps) {
  const router = useRouter();
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSimilarProperties = async () => {
      try {
        setLoading(true);
        
        // Mock similar properties data - in real app, this would be an API call
        // based on property type, location, bedrooms, and price range
        const mockSimilarProperties: Property[] = [
          {
            id: 'similar-1',
            title: 'Charming 2 Bed Apartment Near City Centre',
            rent_monthly: '2000',
            location_display: `${currentProperty.town_name}, ${currentProperty.county_name}`,
            property_type: currentProperty.property_type,
            bedrooms: currentProperty.bedrooms,
            bathrooms: 1,
            furnished: 'furnished',
            available_from: '2025-02-15',
            main_image: null,
            features: ['Parking', 'Balcony', 'Modern Kitchen'],
            ber_rating: 'B3'
          },
          {
            id: 'similar-2',
            title: `Lovely ${currentProperty.bedrooms} Bedroom ${currentProperty.property_type}`,
            rent_monthly: (parseInt(currentProperty.rent_monthly) - 200).toString(),
            location_display: `${currentProperty.town_name}, ${currentProperty.county_name}`,
            property_type: currentProperty.property_type,
            bedrooms: currentProperty.bedrooms,
            bathrooms: 2,
            furnished: 'part_furnished',
            available_from: '2025-03-01',
            main_image: null,
            features: ['Garden', 'Pets Allowed', 'Storage'],
            ber_rating: 'C1'
          },
          {
            id: 'similar-3',
            title: 'Modern Living in Prime Location',
            rent_monthly: (parseInt(currentProperty.rent_monthly) + 100).toString(),
            location_display: `${currentProperty.county_name}`,
            property_type: currentProperty.property_type,
            bedrooms: currentProperty.bedrooms,
            bathrooms: 2,
            furnished: 'furnished',
            available_from: '2025-02-01',
            main_image: null,
            features: ['Gym', 'Concierge', 'City Views'],
            ber_rating: 'A3'
          },
          {
            id: 'similar-4',
            title: 'Spacious Family Home with Garden',
            rent_monthly: (parseInt(currentProperty.rent_monthly) + 300).toString(),
            location_display: `${currentProperty.town_name}, ${currentProperty.county_name}`,
            property_type: currentProperty.property_type === 'apartment' ? 'house' : currentProperty.property_type,
            bedrooms: currentProperty.bedrooms + 1,
            bathrooms: 2,
            furnished: 'unfurnished',
            available_from: '2025-03-15',
            main_image: null,
            features: ['Garden', 'Driveway', 'Fireplace'],
            ber_rating: 'B2'
          }
        ];

        // Filter out the current property and randomize the results
        const filtered = mockSimilarProperties
          .filter(prop => prop.id !== currentProperty.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        setSimilarProperties(filtered);
      } catch (err) {
        setError('Failed to load similar properties');
        console.error('Error fetching similar properties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarProperties();
  }, [currentProperty]);

  const handlePropertySelect = (property: Property) => {
    router.push(`/property/${property.id}`);
  };

  const handleViewAllSimilar = () => {
    // Navigate to search results with similar criteria
    const searchParams = new URLSearchParams({
      property_type: currentProperty.property_type,
      bedrooms: currentProperty.bedrooms.toString(),
      county: currentProperty.county_name.toLowerCase(),
      rent_max: (parseInt(currentProperty.rent_monthly) * 1.2).toString()
    });
    
    router.push(`/?${searchParams.toString()}`);
  };

  if (loading) {
    return (
      <section className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Similar Properties</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Similar Properties</h2>
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (similarProperties.length === 0) {
    return (
      <section className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Similar Properties</h2>
        <div className="text-center py-8">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No similar properties found in this area</p>
          <button
            onClick={handleViewAllSimilar}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Browse All Properties
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Similar Properties</h2>
          <p className="text-sm text-gray-600 mt-1">
            Properties with similar features in {currentProperty.town_name}
          </p>
        </div>
        <button
          onClick={handleViewAllSimilar}
          className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
        >
          View all
          <ArrowRightIcon className="h-4 w-4 ml-1" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {similarProperties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onSelect={handlePropertySelect}
            className="hover:shadow-lg transition-shadow duration-200"
          />
        ))}
      </div>

      {/* Recommendation criteria */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="bg-gray-100 px-2 py-1 rounded">
            Similar type: {currentProperty.property_type}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded">
            {currentProperty.bedrooms} bedroom{currentProperty.bedrooms !== 1 ? 's' : ''}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded">
            Location: {currentProperty.town_name}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded">
            Price range: €{Math.floor(parseInt(currentProperty.rent_monthly) * 0.8)} - €{Math.ceil(parseInt(currentProperty.rent_monthly) * 1.2)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Recommendations based on property type, location, size, and price range
        </p>
      </div>
    </section>
  );
}
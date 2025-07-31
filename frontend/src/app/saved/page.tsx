'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  HeartIcon,
  HomeIcon, 
  MapPinIcon,
  EyeIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface SavedProperty {
  id: string;
  title: string;
  rent: number;
  location: string;
  county: string;
  town: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  image_url?: string;
  saved_at: string;
  landlord_name: string;
  ber_rating?: string;
  available_from: string;
}

export default function SavedProperties() {
  const router = useRouter();
  const { user } = useAuth();
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'saved_at' | 'rent' | 'title'>('saved_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Mock data - will be replaced with API calls
    const mockProperties: SavedProperty[] = [
      {
        id: '1',
        title: 'Modern 2 Bed Apartment in Dublin 2',
        rent: 2200,
        location: 'Dublin 2',
        county: 'Dublin',
        town: 'Dublin',
        property_type: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        description: 'Beautiful modern apartment in the heart of Dublin city centre with excellent transport links.',
        saved_at: '2025-01-25T10:30:00Z',
        landlord_name: 'John Smith',
        ber_rating: 'B2',
        available_from: '2025-02-01T00:00:00Z'
      },
      {
        id: '2',
        title: 'Spacious House in Cork City Centre',
        rent: 1800,
        location: 'Cork City',
        county: 'Cork',
        town: 'Cork',
        property_type: 'house',
        bedrooms: 3,
        bathrooms: 2,
        description: 'Large family home with garden, perfect for professionals or small families.',
        saved_at: '2025-01-24T15:45:00Z',
        landlord_name: 'Mary O\'Brien',
        ber_rating: 'C1',
        available_from: '2025-02-15T00:00:00Z'
      },
      {
        id: '3',
        title: 'Cozy Studio in Temple Bar',
        rent: 1500,
        location: 'Dublin 1',
        county: 'Dublin',
        town: 'Dublin',
        property_type: 'studio',
        bedrooms: 0,
        bathrooms: 1,
        description: 'Perfectly located studio apartment in the cultural quarter of Dublin.',
        saved_at: '2025-01-23T09:15:00Z',
        landlord_name: 'David Murphy',
        ber_rating: 'D1',
        available_from: '2025-02-01T00:00:00Z'
      },
      {
        id: '4',
        title: 'Luxury 1 Bed Apartment with Balcony',
        rent: 1900,
        location: 'Galway City',
        county: 'Galway',
        town: 'Galway',
        property_type: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        description: 'High-end apartment with stunning views and premium finishes.',
        saved_at: '2025-01-22T14:20:00Z',
        landlord_name: 'Sarah Walsh',
        ber_rating: 'A3',
        available_from: '2025-03-01T00:00:00Z'
      },
      {
        id: '5',
        title: 'Student-Friendly House Share',
        rent: 650,
        location: 'Cork',
        county: 'Cork',
        town: 'Cork',
        property_type: 'house_share',
        bedrooms: 1,
        bathrooms: 1,
        description: 'Great location for students, close to UCC campus with all amenities.',
        saved_at: '2025-01-21T11:10:00Z',
        landlord_name: 'Tom Collins',
        ber_rating: 'C2',
        available_from: '2025-02-10T00:00:00Z'
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setProperties(mockProperties);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredAndSortedProperties = properties
    .filter(property => 
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.county.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'rent') {
        aValue = a.rent;
        bValue = b.rent;
      } else if (sortBy === 'saved_at') {
        aValue = new Date(a.saved_at).getTime();
        bValue = new Date(b.saved_at).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleUnsaveProperty = (propertyId: string) => {
    // Mock unsave action - will be replaced with API call
    setProperties(prev => prev.filter(p => p.id !== propertyId));
  };

  const handleViewProperty = (propertyId: string) => {
    router.push(`/property/${propertyId}`);
  };

  const getPropertyTypeDisplay = (type: string) => {
    switch (type) {
      case 'apartment': return 'Apartment';
      case 'house': return 'House';
      case 'studio': return 'Studio';
      case 'house_share': return 'House Share';
      default: return type;
    }
  };

  const getBerColor = (rating?: string) => {
    if (!rating) return 'bg-gray-500';
    const letter = rating.charAt(0);
    switch (letter) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-lime-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      case 'E': return 'bg-red-500';
      case 'F': return 'bg-red-700';
      case 'G': return 'bg-red-900';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your saved properties...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <HeartIconSolid className="h-6 w-6 text-red-500 mr-2" />
                  Saved Properties
                </h1>
                <p className="text-gray-600 mt-1">
                  {properties.length} {properties.length === 1 ? 'property' : 'properties'} saved
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Find More Properties
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search saved properties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'saved_at' | 'rent' | 'title')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="saved_at">Sort by Date Saved</option>
                  <option value="rent">Sort by Rent</option>
                  <option value="title">Sort by Title</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          {filteredAndSortedProperties.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAndSortedProperties.map((property) => (
                <div key={property.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {property.title}
                        </h3>
                        <div className="flex items-center text-gray-600 mb-2">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">{property.location}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{getPropertyTypeDisplay(property.property_type)}</span>
                          {property.bedrooms > 0 && (
                            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                          )}
                          <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {property.ber_rating && (
                          <span className={`px-2 py-1 rounded text-white text-xs font-medium ${getBerColor(property.ber_rating)}`}>
                            {property.ber_rating}
                          </span>
                        )}
                        <button
                          onClick={() => handleUnsaveProperty(property.id)}
                          className="text-red-500 hover:text-red-600 transition-colors"
                          title="Remove from saved"
                        >
                          <HeartIconSolid className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {property.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          €{property.rent.toLocaleString()}
                          <span className="text-sm font-normal text-gray-600">/month</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Available from {formatDate(property.available_from)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewProperty(property.id)}
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Landlord: {property.landlord_name}
                        </span>
                        <span className="text-gray-500">
                          Saved {formatDate(property.saved_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                {searchTerm ? (
                  <>
                    <MagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
                    <p className="text-gray-600 mb-4">
                      No saved properties match your search "{searchTerm}"
                    </p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No saved properties yet</h3>
                    <p className="text-gray-600 mb-6">
                      Start browsing properties and save your favorites to see them here
                    </p>
                    <button
                      onClick={() => router.push('/')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Browse Properties
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
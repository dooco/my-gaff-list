'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LandlordOrAgentRoute } from '@/components/auth/ProtectedRoute';
import { 
  HomeIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface Property {
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
  status: 'active' | 'rented' | 'draft' | 'inactive';
  created_at: string;
  updated_at: string;
  views_count: number;
  enquiries_count: number;
  saved_count: number;
  ber_rating?: string;
  available_from: string;
  images: string[];
}

interface DashboardStats {
  total_properties: number;
  active_properties: number;
  rented_properties: number;
  draft_properties: number;
  total_enquiries: number;
  total_views: number;
  average_rent: number;
}

export default function ManageProperties() {
  const router = useRouter();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_properties: 0,
    active_properties: 0,
    rented_properties: 0,
    draft_properties: 0,
    total_enquiries: 0,
    total_views: 0,
    average_rent: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'rent' | 'views_count' | 'enquiries_count'>('created_at');

  useEffect(() => {
    // Mock data - will be replaced with API calls
    const mockProperties: Property[] = [
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
        status: 'active',
        created_at: '2025-01-20T10:00:00Z',
        updated_at: '2025-01-25T14:30:00Z',
        views_count: 145,
        enquiries_count: 8,
        saved_count: 12,
        ber_rating: 'B2',
        available_from: '2025-02-01T00:00:00Z',
        images: ['apartment1.jpg', 'apartment2.jpg']
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
        status: 'rented',
        created_at: '2025-01-18T09:30:00Z',
        updated_at: '2025-01-22T11:15:00Z',
        views_count: 98,
        enquiries_count: 15,
        saved_count: 7,
        ber_rating: 'C1',
        available_from: '2025-02-15T00:00:00Z',
        images: ['house1.jpg']
      },
      {
        id: '3',
        title: 'Luxury Studio Near Trinity College',
        rent: 1600,
        location: 'Dublin 2',
        county: 'Dublin',
        town: 'Dublin',
        property_type: 'studio',
        bedrooms: 0,
        bathrooms: 1,
        description: 'Premium studio apartment perfect for students or young professionals.',
        status: 'draft',
        created_at: '2025-01-25T16:45:00Z',
        updated_at: '2025-01-25T16:45:00Z',
        views_count: 0,
        enquiries_count: 0,
        saved_count: 0,
        ber_rating: 'A3',
        available_from: '2025-03-01T00:00:00Z',
        images: []
      },
      {
        id: '4',
        title: 'Charming 1 Bed in Galway City',
        rent: 1400,
        location: 'Galway City',
        county: 'Galway',
        town: 'Galway',
        property_type: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        description: 'Cozy apartment in the heart of Galway with all amenities nearby.',
        status: 'active',
        created_at: '2025-01-15T14:20:00Z',
        updated_at: '2025-01-20T10:30:00Z',
        views_count: 67,
        enquiries_count: 4,
        saved_count: 8,
        ber_rating: 'B3',
        available_from: '2025-02-10T00:00:00Z',
        images: ['galway1.jpg', 'galway2.jpg', 'galway3.jpg']
      },
      {
        id: '5',
        title: 'House Share Room - Cork Student Area',
        rent: 650,
        location: 'Cork',
        county: 'Cork',
        town: 'Cork',
        property_type: 'house_share',
        bedrooms: 1,
        bathrooms: 1,
        description: 'Great room in student house, close to UCC campus.',
        status: 'inactive',
        created_at: '2025-01-10T12:15:00Z',
        updated_at: '2025-01-24T15:45:00Z',
        views_count: 34,
        enquiries_count: 2,
        saved_count: 3,
        ber_rating: 'D1',
        available_from: '2025-02-01T00:00:00Z',
        images: ['room1.jpg']
      }
    ];

    const mockStats: DashboardStats = {
      total_properties: mockProperties.length,
      active_properties: mockProperties.filter(p => p.status === 'active').length,
      rented_properties: mockProperties.filter(p => p.status === 'rented').length,
      draft_properties: mockProperties.filter(p => p.status === 'draft').length,
      total_enquiries: mockProperties.reduce((sum, p) => sum + p.enquiries_count, 0),
      total_views: mockProperties.reduce((sum, p) => sum + p.views_count, 0),
      average_rent: Math.round(mockProperties.reduce((sum, p) => sum + p.rent, 0) / mockProperties.length)
    };

    // Simulate API delay
    setTimeout(() => {
      setProperties(mockProperties);
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredAndSortedProperties = properties
    .filter(property => {
      const matchesSearch = 
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.county.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'rent') {
        return b.rent - a.rent;
      } else if (sortBy === 'views_count') {
        return b.views_count - a.views_count;
      } else {
        return b.enquiries_count - a.enquiries_count;
      }
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rented':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'draft':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'rented':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const handleDeleteProperty = (propertyId: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      setProperties(prev => prev.filter(p => p.id !== propertyId));
    }
  };

  const statusCounts = {
    all: properties.length,
    active: properties.filter(p => p.status === 'active').length,
    rented: properties.filter(p => p.status === 'rented').length,
    draft: properties.filter(p => p.status === 'draft').length,
    inactive: properties.filter(p => p.status === 'inactive').length
  };

  if (loading) {
    return (
      <LandlordOrAgentRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your properties...</p>
          </div>
        </div>
      </LandlordOrAgentRoute>
    );
  }

  return (
    <LandlordOrAgentRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <HomeIcon className="h-6 w-6 text-blue-500 mr-2" />
                  Manage Properties
                </h1>
                <p className="text-gray-600 mt-1">
                  {stats.total_properties} {stats.total_properties === 1 ? 'property' : 'properties'} listed
                </p>
              </div>
              <button
                onClick={() => router.push('/properties/add')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Property
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <HomeIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_properties}</p>
                  <p className="text-sm text-gray-600">Total Properties</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EyeIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_views}</p>
                  <p className="text-sm text-gray-600">Total Views</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_enquiries}</p>
                  <p className="text-sm text-gray-600">Total Enquiries</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-orange-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">€{stats.average_rent}</p>
                  <p className="text-sm text-gray-600">Average Rent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'all', label: 'All Properties', count: statusCounts.all },
                  { key: 'active', label: 'Active', count: statusCounts.active },
                  { key: 'rented', label: 'Rented', count: statusCounts.rented },
                  { key: 'draft', label: 'Draft', count: statusCounts.draft },
                  { key: 'inactive', label: 'Inactive', count: statusCounts.inactive }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      statusFilter === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        statusFilter === tab.key
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created_at' | 'rent' | 'views_count' | 'enquiries_count')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Sort by Date Created</option>
                <option value="rent">Sort by Rent</option>
                <option value="views_count">Sort by Views</option>
                <option value="enquiries_count">Sort by Enquiries</option>
              </select>
            </div>
          </div>

          {/* Properties List */}
          {filteredAndSortedProperties.length > 0 ? (
            <div className="space-y-6">
              {filteredAndSortedProperties.map((property) => (
                <div key={property.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {property.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(property.status)}`}>
                            {getStatusIcon(property.status)}
                            <span className="ml-1 capitalize">{property.status}</span>
                          </span>
                          {property.ber_rating && (
                            <span className={`px-2 py-1 rounded text-white text-xs font-medium ${getBerColor(property.ber_rating)}`}>
                              {property.ber_rating}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {property.location}
                          </div>
                          <span>{getPropertyTypeDisplay(property.property_type)}</span>
                          {property.bedrooms > 0 && (
                            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                          )}
                          <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="text-2xl font-bold text-gray-900">
                          €{property.rent.toLocaleString()}
                          <span className="text-sm font-normal text-gray-600">/month</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-6">
                        <button
                          onClick={() => router.push(`/property/${property.id}`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Property"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => router.push(`/properties/edit/${property.id}`)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Property"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProperty(property.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Property"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{property.views_count}</div>
                          <div className="text-gray-600">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{property.enquiries_count}</div>
                          <div className="text-gray-600">Enquiries</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{property.saved_count}</div>
                          <div className="text-gray-600">Saved</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{property.images.length}</div>
                          <div className="text-gray-600">Photos</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                        <span>Created {formatDate(property.created_at)}</span>
                        <span>Updated {formatDate(property.updated_at)}</span>
                        <span>Available from {formatDate(property.available_from)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <HomeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No properties match your current filters' 
                    : 'Start by adding your first property listing'
                  }
                </p>
                <button
                  onClick={() => router.push('/properties/add')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Property
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LandlordOrAgentRoute>
  );
}
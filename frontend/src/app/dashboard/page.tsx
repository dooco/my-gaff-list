'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { NotificationBell } from '@/components/NotificationSystem';
import { 
  HeartIcon, 
  DocumentTextIcon, 
  HomeIcon,
  EyeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface DashboardStats {
  saved_properties: number;
  enquiries_sent: number;
  enquiries_replied: number;
  profile_views: number;
}

interface SavedProperty {
  id: string;
  title: string;
  rent: number;
  location: string;
  property_type: string;
  bedrooms: number;
  image_url?: string;
  saved_at: string;
}

interface Enquiry {
  id: string;
  property_title: string;
  property_id: string;
  message: string;
  status: 'pending' | 'replied' | 'viewed';
  created_at: string;
  replied_at?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    saved_properties: 0,
    enquiries_sent: 0,
    enquiries_replied: 0,
    profile_views: 0
  });
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - will be replaced with API calls
    const mockStats: DashboardStats = {
      saved_properties: 12,
      enquiries_sent: 8,
      enquiries_replied: 5,
      profile_views: 24
    };

    const mockSavedProperties: SavedProperty[] = [
      {
        id: '1',
        title: 'Modern 2 Bed Apartment in Dublin 2',
        rent: 2200,
        location: 'Dublin 2',
        property_type: 'apartment',
        bedrooms: 2,
        saved_at: '2025-01-25T10:30:00Z'
      },
      {
        id: '2',  
        title: 'Spacious House in Cork City Centre',
        rent: 1800,
        location: 'Cork City',
        property_type: 'house',
        bedrooms: 3,
        saved_at: '2025-01-24T15:45:00Z'
      },
      {
        id: '3',
        title: 'Cozy Studio in Temple Bar',
        rent: 1500,
        location: 'Dublin 1',
        property_type: 'studio',
        bedrooms: 0,
        saved_at: '2025-01-23T09:15:00Z'
      }
    ];

    const mockEnquiries: Enquiry[] = [
      {
        id: '1',
        property_title: 'Modern 2 Bed Apartment in Dublin 2',
        property_id: '1',
        message: 'Hi, I\'m interested in viewing this property. When would be a good time?',
        status: 'replied',
        created_at: '2025-01-25T11:00:00Z',
        replied_at: '2025-01-25T14:20:00Z'
      },
      {
        id: '2',
        property_title: 'Spacious House in Cork City Centre',
        property_id: '2',
        message: 'Is this property still available? I would like to schedule a viewing.',
        status: 'viewed',
        created_at: '2025-01-24T16:30:00Z'
      },
      {
        id: '3',
        property_title: 'Cozy Studio in Temple Bar',
        property_id: '3',
        message: 'What\'s included in the rent? Are utilities covered?',
        status: 'pending',
        created_at: '2025-01-23T10:45:00Z'
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setStats(mockStats);
      setSavedProperties(mockSavedProperties);
      setRecentEnquiries(mockEnquiries);
      setLoading(false);
    }, 1000);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEnquiryStatusIcon = (status: string) => {
    switch (status) {
      case 'replied':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'viewed':
        return <EyeIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getEnquiryStatusText = (status: string) => {
    switch (status) {
      case 'replied':
        return 'Replied';
      case 'viewed':
        return 'Viewed';
      default:
        return 'Pending';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your dashboard...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.first_name || user?.username}!
                </h1>
                <p className="text-gray-600 mt-1">
                  Here's what's happening with your property search
                </p>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleDateString('en-IE')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <HeartIconSolid className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.saved_properties}</p>
                  <p className="text-sm text-gray-600">Saved Properties</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.enquiries_sent}</p>
                  <p className="text-sm text-gray-600">Enquiries Sent</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.enquiries_replied}</p>
                  <p className="text-sm text-gray-600">Enquiries Replied</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.profile_views}</p>
                  <p className="text-sm text-gray-600">Profile Views</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Saved Properties */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <HeartIcon className="h-5 w-5 mr-2 text-red-500" />
                    Recent Saved Properties
                  </h2>
                  <a 
                    href="/saved" 
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all
                  </a>
                </div>
              </div>
              <div className="p-6">
                {savedProperties.length > 0 ? (
                  <div className="space-y-4">
                    {savedProperties.map((property) => (
                      <div key={property.id} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <HomeIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {property.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            €{property.rent}/month • {property.location}
                          </p>
                          <p className="text-xs text-gray-500">
                            Saved {formatDate(property.saved_at)}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <button className="text-red-500 hover:text-red-600">
                            <HeartIconSolid className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <HeartIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No saved properties yet</p>
                    <p className="text-sm text-gray-400">Start browsing to save your favorites</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Enquiries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                    Recent Enquiries
                  </h2>
                  <a 
                    href="/enquiries" 
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all
                  </a>
                </div>
              </div>
              <div className="p-6">
                {recentEnquiries.length > 0 ? (
                  <div className="space-y-4">
                    {recentEnquiries.map((enquiry) => (
                      <div key={enquiry.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900 mb-2">
                              {enquiry.property_title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {enquiry.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatDate(enquiry.created_at)}
                              </span>
                              <div className="flex items-center space-x-1">
                                {getEnquiryStatusIcon(enquiry.status)}
                                <span className="text-xs font-medium text-gray-600">
                                  {getEnquiryStatusText(enquiry.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No enquiries sent yet</p>
                    <p className="text-sm text-gray-400">Contact landlords to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href="/"
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="text-center">
                  <HomeIcon className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
                    Browse Properties
                  </span>
                </div>
              </a>
              
              <a
                href="/saved"
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors group"
              >
                <div className="text-center">
                  <HeartIcon className="h-8 w-8 text-gray-400 group-hover:text-red-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-red-600">
                    View Saved
                  </span>
                </div>
              </a>
              
              <a
                href="/enquiries"
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
              >
                <div className="text-center">
                  <DocumentTextIcon className="h-8 w-8 text-gray-400 group-hover:text-green-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-green-600">
                    My Enquiries
                  </span>
                </div>
              </a>
              
              <a
                href="/profile"
                className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
              >
                <div className="text-center">
                  <CalendarDaysIcon className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-600 group-hover:text-purple-600">
                    Profile Settings
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
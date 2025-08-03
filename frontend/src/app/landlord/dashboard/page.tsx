'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import {
  BuildingOfficeIcon,
  PlusIcon,
  EnvelopeIcon,
  EyeIcon,
  ChartBarIcon,
  HomeIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { authService } from '@/services/authService';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface DashboardStats {
  total_properties: number;
  active_properties: number;
  total_enquiries: number;
  pending_enquiries: number;
  total_views: number;
  this_month_views: number;
  average_response_time: number;
  occupancy_rate: number;
}

interface RecentActivity {
  type: string;
  message: string;
  property: string;
  user: string;
  timestamp: string;
  status: string;
}

export default function LandlordDashboard() {
  const { user, tokens } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_properties: 0,
    active_properties: 0,
    total_enquiries: 0,
    pending_enquiries: 0,
    total_views: 0,
    this_month_views: 0,
    average_response_time: 0,
    occupancy_rate: 0
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!tokens?.access) return;

      try {
        setLoading(true);
        
        // Fetch dashboard stats
        const statsResponse = await fetch(`${BASE_URL}/api/landlords/dashboard/stats/`, {
          headers: {
            'Authorization': `Bearer ${tokens.access}`,
          },
        });

        if (!statsResponse.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }

        const statsData = await statsResponse.json();
        setStats(statsData);

        // Fetch recent activity
        const activityResponse = await fetch(`${BASE_URL}/api/landlords/dashboard/activity/`, {
          headers: {
            'Authorization': `Bearer ${tokens.access}`,
          },
        });

        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          setActivities(activityData.activities || []);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [tokens]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enquiry':
        return <EnvelopeIcon className="h-5 w-5 text-blue-500" />;
      case 'view':
        return <EyeIcon className="h-5 w-5 text-green-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      sent: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      read: { color: 'bg-blue-100 text-blue-800', text: 'Read' },
      replied: { color: 'bg-green-100 text-green-800', text: 'Replied' },
      closed: { color: 'bg-gray-100 text-gray-800', text: 'Closed' }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.sent;
    
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
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
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Landlord Dashboard
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Welcome back, {user?.first_name}! Manage your properties and enquiries.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/landlord/properties/add"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Property
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

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
                  <p className="text-xs text-gray-500">{stats.active_properties} active</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EnvelopeIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_enquiries}</p>
                  <p className="text-sm text-gray-600">Total Enquiries</p>
                  <p className="text-xs text-gray-500">{stats.pending_enquiries} pending</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EyeIcon className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_views}</p>
                  <p className="text-sm text-gray-600">Total Views</p>
                  <p className="text-xs text-gray-500">{stats.this_month_views} this month</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-orange-500" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.occupancy_rate}%</p>
                  <p className="text-sm text-gray-600">Interest Rate</p>
                  <p className="text-xs text-gray-500">{stats.average_response_time}h avg response</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href="/landlord/properties/add"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="text-center">
                      <PlusIcon className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
                        Add Property
                      </span>
                    </div>
                  </Link>
                  
                  <Link
                    href="/landlord/properties"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
                  >
                    <div className="text-center">
                      <HomeIcon className="h-8 w-8 text-gray-400 group-hover:text-green-500 mx-auto mb-2" />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-green-600">
                        Manage Properties
                      </span>
                    </div>
                  </Link>
                  
                  <Link
                    href="/landlord/enquiries"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                  >
                    <div className="text-center">
                      <EnvelopeIcon className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mx-auto mb-2" />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-purple-600">
                        View Enquiries
                      </span>
                    </div>
                  </Link>
                  
                  <Link
                    href="/landlord/profile"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group"
                  >
                    <div className="text-center">
                      <UserGroupIcon className="h-8 w-8 text-gray-400 group-hover:text-orange-500 mx-auto mb-2" />
                      <span className="text-sm font-medium text-gray-600 group-hover:text-orange-600">
                        Profile Settings
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <Link 
                    href="/landlord/enquiries"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">
                              From {activity.user} • {formatDate(activity.timestamp)}
                            </p>
                            {getStatusBadge(activity.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No recent activity</p>
                    <p className="text-sm text-gray-400">Activity will appear here when you receive enquiries</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Getting Started */}
          {stats.total_properties === 0 && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mt-1" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-blue-900">Welcome to Rentified!</h3>
                  <p className="text-blue-800 mt-2">
                    Get started by adding your first property listing. Our platform makes it easy to manage 
                    your rental properties and connect with quality tenants.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/landlord/properties/add"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Your First Property
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
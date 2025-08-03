'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import {
  PlusIcon,
  HomeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  PowerIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { EyeIcon as EyeIconSolid, PowerIcon as PowerIconSolid } from '@heroicons/react/24/solid';
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Property {
  id: string;
  title: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  rent_monthly: string;
  county_name: string;
  town_name: string;
  location_display: string;
  main_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  total_views: number;
  total_enquiries: number;
  recent_enquiries: number;
}

export default function LandlordProperties() {
  const { tokens, isLoading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; propertyId: string | null }>({
    isOpen: false,
    propertyId: null
  });
  const [deletingProperty, setDeletingProperty] = useState(false);

  const fetchProperties = async (includeDeleted = false) => {
    // Skip if no access token
    if (!tokens?.access) {
      console.log('Skipping fetch - no access token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const url = includeDeleted 
        ? `${BASE_URL}/api/landlords/properties/?include_deleted=true`
        : `${BASE_URL}/api/landlords/properties/`;
      
      console.log('Fetching properties from:', url);
      console.log('Using token:', tokens.access.substring(0, 20) + '...');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch properties: ${response.status}`);
      }

      const data = await response.json();
      setProperties(data.results || data);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if auth is loaded and we have tokens
    if (!authLoading && tokens?.access) {
      fetchProperties(filter === 'deleted');
    } else if (!authLoading && !tokens?.access) {
      setLoading(false);
      setError('Please log in to view properties');
    }
  }, [authLoading, tokens?.access, filter]); // Re-run when auth loading state, access token or filter changes

  const handleToggleActive = async (propertyId: string) => {
    if (!tokens?.access) return;

    try {
      const response = await fetch(`${BASE_URL}/api/landlords/properties/${propertyId}/toggle_active/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle property status');
      }

      const data = await response.json();
      
      // Update the property in the list
      setProperties(prev => prev.map(prop => 
        prop.id === propertyId 
          ? { ...prop, is_active: data.is_active }
          : prop
      ));
    } catch (err) {
      console.error('Error toggling property status:', err);
      alert('Failed to update property status');
    }
  };

  const handleDelete = async () => {
    if (!tokens?.access || !deleteModal.propertyId) return;

    try {
      setDeletingProperty(true);
      
      const response = await fetch(`${BASE_URL}/api/landlords/properties/${deleteModal.propertyId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      // Remove property from list or refresh
      if (filter === 'deleted') {
        fetchProperties(true);
      } else {
        setProperties(prev => prev.filter(prop => prop.id !== deleteModal.propertyId));
      }
      
      setDeleteModal({ isOpen: false, propertyId: null });
    } catch (err) {
      console.error('Error deleting property:', err);
      alert('Failed to delete property');
    } finally {
      setDeletingProperty(false);
    }
  };

  const handleRestore = async (propertyId: string) => {
    if (!tokens?.access) return;

    try {
      const response = await fetch(`${BASE_URL}/api/landlords/properties/${propertyId}/restore/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to restore property');
      }

      // Refresh the list
      fetchProperties(filter === 'deleted');
    } catch (err) {
      console.error('Error restoring property:', err);
      alert('Failed to restore property');
    }
  };

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
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredProperties = properties.filter(property => {
    switch (filter) {
      case 'active':
        return property.is_active && !property.deleted_at;
      case 'inactive':
        return !property.is_active && !property.deleted_at;
      case 'deleted':
        return property.deleted_at !== null;
      default:
        return !property.deleted_at;
    }
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your properties...</p>
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
                  <HomeIcon className="h-6 w-6 text-blue-500 mr-2" />
                  My Properties
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your property listings and track performance
                </p>
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

          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All Properties' },
                  { key: 'active', label: 'Active' },
                  { key: 'inactive', label: 'Inactive' },
                  { key: 'deleted', label: 'Deleted' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      filter === key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {filteredProperties.length} properties
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
                    property.deleted_at 
                      ? 'border-red-200 bg-red-50' 
                      : property.is_active 
                        ? 'border-gray-200' 
                        : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  {/* Property Image */}
                  <div className="aspect-[4/3] bg-gray-200 rounded-t-lg overflow-hidden relative">
                    {property.main_image_url ? (
                      <img
                        src={property.main_image_url}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <HomeIcon className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        property.deleted_at
                          ? 'bg-red-100 text-red-800'
                          : property.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {property.deleted_at ? 'Deleted' : property.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Quick Actions */}
                    {!property.deleted_at && (
                      <div className="absolute top-3 right-3 flex gap-1">
                        <button
                          onClick={() => handleToggleActive(property.id)}
                          className={`p-1.5 rounded-full transition-colors ${
                            property.is_active
                              ? 'bg-red-100 hover:bg-red-200 text-red-600'
                              : 'bg-green-100 hover:bg-green-200 text-green-600'
                          }`}
                          title={property.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <PowerIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Property Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {property.title}
                      </h3>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      <p>{property.location_display}</p>
                      <p className="capitalize">{property.property_type} • {property.bedrooms} bed • {property.bathrooms} bath</p>
                    </div>

                    <div className="text-xl font-bold text-gray-900 mb-3">
                      {formatPrice(property.rent_monthly)}/month
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        {property.total_views} views
                      </div>
                      <div className="flex items-center">
                        <ChartBarIcon className="h-4 w-4 mr-1" />
                        {property.total_enquiries} enquiries
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {property.deleted_at ? (
                        <>
                          <button
                            onClick={() => handleRestore(property.id)}
                            className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center flex items-center justify-center"
                          >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Restore
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/property/${property.id}`}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center flex items-center justify-center"
                          >
                            <EyeIconSolid className="h-4 w-4 mr-1" />
                            View
                          </Link>
                          <Link
                            href={`/landlord/properties/edit/${property.id}`}
                            className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center flex items-center justify-center"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, propertyId: property.id })}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Recent Activity */}
                    {property.recent_enquiries > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-green-600">
                          {property.recent_enquiries} new enquir{property.recent_enquiries === 1 ? 'y' : 'ies'} this week
                        </p>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                      Created {formatDate(property.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <HomeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'all' ? 'No properties yet' : `No ${filter} properties`}
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? 'Get started by adding your first property listing'
                  : `You don't have any ${filter} properties at the moment`
                }
              </p>
              {filter === 'all' && (
                <Link
                  href="/landlord/properties/add"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Property
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, propertyId: null })}
        onConfirm={handleDelete}
        loading={deletingProperty}
      />
    </ProtectedRoute>
  );
}
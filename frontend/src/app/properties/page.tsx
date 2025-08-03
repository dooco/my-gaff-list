'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import PropertyGrid from '@/components/PropertyGrid';
import { useProperties } from '@/hooks/useProperties';
import { Property, PropertyFilters } from '@/types/property';
import { FunnelIcon } from '@heroicons/react/24/outline';

export default function PropertiesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { properties, loading, error, totalCount } = useProperties(filters);

  const handleSearch = (newFilters: PropertyFilters) => {
    setFilters(newFilters);
  };

  const handlePropertySelect = (property: Property) => {
    router.push(`/property/${property.id}`);
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Browse Properties
              </h1>
              <p className="text-gray-600 mt-1">
                Find your perfect rental home in Ireland
              </p>
            </div>
            {totalCount > 0 && (
              <div className="text-sm text-gray-500">
                {totalCount} properties available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <SearchBar 
            onSearch={handleSearch}
            loading={loading}
          />
        </div>

        {/* Active Filters */}
        {Object.keys(filters).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">Active Filters</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.county && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  County: {filters.county}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, county: undefined }))}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.town && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Town: {filters.town}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, town: undefined }))}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.property_type && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Type: {filters.property_type}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, property_type: undefined }))}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.bedrooms && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  {filters.bedrooms} bed{filters.bedrooms !== 1 ? 's' : ''}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, bedrooms: undefined }))}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.rent_max && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                  Max: €{filters.rent_max}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, rent_max: undefined }))}
                    className="ml-2 text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {Object.keys(filters).length > 0 
                ? `Search Results (${properties.length} of ${totalCount})` 
                : `All Properties (${properties.length})`
              }
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Property Grid */}
        <PropertyGrid
          properties={properties}
          loading={loading}
          error={error}
          onPropertySelect={handlePropertySelect}
        />

        {/* No results message */}
        {!loading && !error && properties.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No properties found
            </h3>
            <p className="text-gray-500 mb-4">
              {Object.keys(filters).length > 0
                ? 'Try adjusting your filters to see more results'
                : 'No properties are currently available'}
            </p>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
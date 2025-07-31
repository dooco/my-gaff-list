'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import PropertyGrid from '@/components/PropertyGrid';
import UserMenu from '@/components/layout/UserMenu';
import { useProperties } from '@/hooks/useProperties';
import { Property, PropertyFilters } from '@/types/property';

export default function Home() {
  const router = useRouter();
  const [filters, setFilters] = useState<PropertyFilters>({});
  const { properties, loading, error, totalCount } = useProperties(filters);

  const handleSearch = (newFilters: PropertyFilters) => {
    setFilters(newFilters);
  };

  const handlePropertySelect = (property: Property) => {
    router.push(`/property/${property.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Gaff List
              </h1>
              <p className="text-sm text-gray-600">
                Find your perfect rental in Ireland
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {totalCount > 0 && `${totalCount} properties available`}
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <SearchBar 
            onSearch={handleSearch}
            loading={loading}
          />
        </div>

        {/* Results Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {Object.keys(filters).length > 0 ? 'Search Results' : 'Featured Properties'}
            </h2>
            {properties.length > 0 && (
              <div className="text-sm text-gray-500">
                {properties.length} of {totalCount} properties
              </div>
            )}
          </div>
          {Object.keys(filters).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.county && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  County: {filters.county}
                </span>
              )}
              {filters.town && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Town: {filters.town}
                </span>
              )}
              {filters.property_type && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Type: {filters.property_type}
                </span>
              )}
              {filters.bedrooms && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {filters.bedrooms} bed{filters.bedrooms !== 1 ? 's' : ''}
                </span>
              )}
              {filters.rent_max && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Max: €{filters.rent_max}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Property Grid */}
        <PropertyGrid
          properties={properties}
          loading={loading}
          error={error}
          onPropertySelect={handlePropertySelect}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 My Gaff List. Find your perfect rental home in Ireland.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

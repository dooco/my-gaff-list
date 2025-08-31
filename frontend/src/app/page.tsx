'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AdvancedSearchBar from '@/components/AdvancedSearchBar';
import FilterChips from '@/components/FilterChips';
import PropertyGrid from '@/components/PropertyGrid';
import { useProperties } from '@/hooks/useProperties';
import { Property, PropertyFilters } from '@/types/property';
import { MapIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

// Dynamic import for map component to avoid SSR issues
const PropertiesMapView = dynamic(
  () => import('@/components/PropertiesMapView'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-100 animate-pulse flex items-center justify-center">
        <p>Loading map...</p>
      </div>
    )
  }
);

export default function Home() {
  const router = useRouter();
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const { properties, loading, error, totalCount } = useProperties(filters);

  const handleSearch = (newFilters: PropertyFilters) => {
    setFilters(newFilters);
  };

  const handlePropertySelect = (property: Property) => {
    router.push(`/property/${property.id}`);
  };

  const handleRemoveFilter = (key: keyof PropertyFilters) => {
    const updatedFilters = { ...filters };
    delete updatedFilters[key];
    setFilters(updatedFilters);
  };

  const handleClearAllFilters = () => {
    setFilters({});
  };

  // Debug logging
  console.log('Current view mode:', viewMode);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Your Perfect Rental in Ireland
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Browse thousands of verified properties across Ireland
          </p>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500">
              {totalCount} properties available
            </p>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <AdvancedSearchBar 
            onSearch={handleSearch}
            loading={loading}
          />
        </div>

        {/* Filter Chips - Show active filters */}
        <FilterChips 
          filters={filters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        {/* Results Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {Object.keys(filters).length > 0 ? 'Search Results' : 'Featured Properties'}
            </h2>
            <div className="flex items-center gap-4">
              {properties.length > 0 && viewMode === 'grid' && (
                <div className="text-sm text-gray-500">
                  {properties.length} of {totalCount} properties
                </div>
              )}
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid view"
                >
                  <Squares2X2Icon className="h-4 w-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === 'map' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Map view"
                >
                  <MapIcon className="h-4 w-4" />
                  Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Property Display - Grid or Map */}
        {viewMode === 'grid' ? (
          <PropertyGrid
            properties={properties}
            loading={loading}
            error={error}
            onPropertySelect={handlePropertySelect}
          />
        ) : (
          <PropertiesMapView
            initialFilters={filters}
            className="mt-4"
            height="600px"
          />
        )}
      </main>
    </div>
  );
}

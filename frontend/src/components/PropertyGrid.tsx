'use client';

import { Property } from '@/types/property';
import PropertyCard from './PropertyCard';

interface PropertyGridProps {
  properties: Property[];
  loading?: boolean;
  error?: string | null;
  onPropertySelect?: (property: Property) => void;
  className?: string;
}

const PropertySkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-gray-200"></div>
    <div className="p-4">
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-5 bg-gray-200 rounded mb-3"></div>
      <div className="flex gap-3 mb-3">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="flex gap-1 mb-3">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
      <div className="flex justify-between">
        <div>
          <div className="h-6 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16 mt-1"></div>
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  </div>
);

export default function PropertyGrid({ 
  properties, 
  loading, 
  error, 
  onPropertySelect,
  className = '' 
}: PropertyGridProps) {
  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-2">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading properties</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: 9 }).map((_, index) => (
          <PropertySkeleton key={index} />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
        <p className="text-gray-500 mb-4">
          Try adjusting your search criteria or explore different locations.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset Search
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onSelect={onPropertySelect}
          />
        ))}
      </div>
      
      {/* Results count */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Showing {properties.length} properties
      </div>
    </div>
  );
}
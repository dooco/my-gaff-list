'use client';

import { useState } from 'react';
import AdvancedSearchBar from '@/components/AdvancedSearchBar';
import FilterChips from '@/components/FilterChips';
import { PropertyFilters } from '@/types/property';

export default function TestAdvancedSearchPage() {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [loading, setLoading] = useState(false);

  const handleSearch = (newFilters: PropertyFilters) => {
    setFilters(newFilters);
    console.log('Search filters:', newFilters);
    
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleRemoveFilter = (key: keyof PropertyFilters) => {
    const updatedFilters = { ...filters };
    delete updatedFilters[key];
    setFilters(updatedFilters);
  };

  const handleClearAll = () => {
    setFilters({});
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Advanced Search</h1>
        
        <AdvancedSearchBar 
          onSearch={handleSearch} 
          loading={loading}
          className="mb-6"
        />
        
        <FilterChips 
          filters={filters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAll}
        />
        
        {Object.keys(filters).length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Active Filters (Debug View)</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(filters, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
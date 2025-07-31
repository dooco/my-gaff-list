'use client';

import { useState, useEffect } from 'react';
import { useCounties, useTowns } from '@/hooks/useLocations';

interface LocationPickerProps {
  selectedCounty?: string;
  selectedTown?: string;
  onCountyChange: (county: string | undefined) => void;
  onTownChange: (town: string | undefined) => void;
  className?: string;
}

export default function LocationPicker({
  selectedCounty,
  selectedTown,
  onCountyChange,
  onTownChange,
  className = ''
}: LocationPickerProps) {
  const { counties, loading: countiesLoading } = useCounties();
  const { towns, loading: townsLoading } = useTowns(selectedCounty);
  
  const handleCountyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countySlug = e.target.value || undefined;
    onCountyChange(countySlug);
    onTownChange(undefined); // Reset town when county changes
  };

  const handleTownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const townSlug = e.target.value || undefined;
    onTownChange(townSlug);
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      {/* County Dropdown */}
      <div className="flex-1">
        <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-1">
          County
        </label>
        <select
          id="county"
          value={selectedCounty || ''}
          onChange={handleCountyChange}
          disabled={countiesLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">All Counties</option>
          {counties.map((county) => (
            <option key={county.slug} value={county.slug}>
              {county.name} ({county.towns_count} towns)
            </option>
          ))}
        </select>
      </div>

      {/* Town Dropdown */}
      <div className="flex-1">
        <label htmlFor="town" className="block text-sm font-medium text-gray-700 mb-1">
          Town/City
        </label>
        <select
          id="town"
          value={selectedTown || ''}
          onChange={handleTownChange}
          disabled={!selectedCounty || townsLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {!selectedCounty 
              ? 'Select county first' 
              : `All of ${counties.find(c => c.slug === selectedCounty)?.name || ''}`
            }
          </option>
          {towns.map((town) => (
            <option key={town.slug} value={town.slug}>
              {town.name}
            </option>
          ))}
        </select>
        {townsLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}
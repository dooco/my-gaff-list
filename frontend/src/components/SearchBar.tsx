'use client';

import { useState } from 'react';
import LocationPicker from './LocationPicker';
import { PropertyFilters } from '@/types/property';

interface SearchBarProps {
  onSearch: (filters: PropertyFilters) => void;
  loading?: boolean;
  className?: string;
}

export default function SearchBar({ onSearch, loading, className = '' }: SearchBarProps) {
  const [county, setCounty] = useState<string | undefined>();
  const [town, setTown] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [maxRent, setMaxRent] = useState<string>('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filters: PropertyFilters = {
      county,
      town,
      search: searchTerm || undefined,
      property_type: propertyType || undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      rent_max: maxRent ? parseInt(maxRent) : undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    onSearch(cleanFilters);
  };

  const handleReset = () => {
    setCounty(undefined);
    setTown(undefined);
    setSearchTerm('');
    setPropertyType('');
    setBedrooms('');
    setMaxRent('');
    onSearch({});
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${className}`}>
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Location and Search Term */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <LocationPicker
            selectedCounty={county}
            selectedTown={town}
            onCountyChange={setCounty}
            onTownChange={setTown}
            className="lg:col-span-2"
          />
          
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keywords, area, property name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Property Type */}
          <div>
            <label htmlFor="property-type" className="block text-sm font-medium text-gray-700 mb-1">
              Property Type
            </label>
            <select
              id="property-type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any Type</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="shared">Shared</option>
              <option value="studio">Studio</option>
              <option value="townhouse">Townhouse</option>
            </select>
          </div>

          {/* Bedrooms */}
          <div>
            <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Bedrooms
            </label>
            <select
              id="bedrooms"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="1">1 bed</option>
              <option value="2">2 beds</option>
              <option value="3">3 beds</option>
              <option value="4">4+ beds</option>
            </select>
          </div>

          {/* Max Rent */}
          <div>
            <label htmlFor="max-rent" className="block text-sm font-medium text-gray-700 mb-1">
              Max Rent
            </label>
            <select
              id="max-rent"
              value={maxRent}
              onChange={(e) => setMaxRent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any Price</option>
              <option value="1000">Up to €1,000</option>
              <option value="1500">Up to €1,500</option>
              <option value="2000">Up to €2,000</option>
              <option value="2500">Up to €2,500</option>
              <option value="3000">Up to €3,000</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Searching...
                </div>
              ) : (
                'Search Properties'
              )}
            </button>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Reset all filters
          </button>
        </div>
      </form>
    </div>
  );
}
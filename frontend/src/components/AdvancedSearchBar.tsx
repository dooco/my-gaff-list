'use client';

import { useState } from 'react';
import LocationPicker from './LocationPicker';
import { PropertyFilters } from '@/types/property';

interface AdvancedSearchBarProps {
  onSearch: (filters: PropertyFilters) => void;
  loading?: boolean;
  className?: string;
}

export default function AdvancedSearchBar({ onSearch, loading, className = '' }: AdvancedSearchBarProps) {
  const [county, setCounty] = useState<string | undefined>();
  const [town, setTown] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [maxRent, setMaxRent] = useState<string>('');
  const [berRating, setBerRating] = useState<string>('');
  const [furnished, setFurnished] = useState<string>('');
  
  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [leaseDurationType, setLeaseDurationType] = useState<string>('');
  const [availableFrom, setAvailableFrom] = useState<string>('');
  const [availableTo, setAvailableTo] = useState<string>('');
  const [petFriendly, setPetFriendly] = useState<boolean | undefined>();
  const [parkingType, setParkingType] = useState<string>('');
  const [outdoorSpace, setOutdoorSpace] = useState<string>('');
  const [billsIncluded, setBillsIncluded] = useState<boolean | undefined>();
  const [viewingType, setViewingType] = useState<string>('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filters: PropertyFilters = {
      county,
      town,
      search: searchTerm || undefined,
      property_type: propertyType || undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      rent_max: maxRent ? parseInt(maxRent) : undefined,
      ber_rating: berRating || undefined,
      furnished: furnished || undefined,
      lease_duration_type: leaseDurationType as any || undefined,
      available_from: availableFrom || undefined,
      available_to: availableTo || undefined,
      pet_friendly: petFriendly,
      parking_type: parkingType as any || undefined,
      outdoor_space: outdoorSpace as any || undefined,
      bills_included: billsIncluded,
      viewing_type: viewingType as any || undefined,
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
    setBerRating('');
    setFurnished('');
    setLeaseDurationType('');
    setAvailableFrom('');
    setAvailableTo('');
    setPetFriendly(undefined);
    setParkingType('');
    setOutdoorSpace('');
    setBillsIncluded(undefined);
    setViewingType('');
    onSearch({});
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

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

        {/* Basic Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <option value="room">Room</option>
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

          {/* BER Rating */}
          <div>
            <label htmlFor="ber-rating" className="block text-sm font-medium text-gray-700 mb-1">
              BER Rating
            </label>
            <select
              id="ber-rating"
              value={berRating}
              onChange={(e) => setBerRating(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any Rating</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="A3">A3</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="B3">B3</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="C3">C3</option>
              <option value="D1">D1</option>
              <option value="D2">D2</option>
              <option value="E1">E1</option>
              <option value="E2">E2</option>
              <option value="F">F</option>
              <option value="G">G</option>
            </select>
          </div>

          {/* Furnished */}
          <div>
            <label htmlFor="furnished" className="block text-sm font-medium text-gray-700 mb-1">
              Furnishing
            </label>
            <select
              id="furnished"
              value={furnished}
              onChange={(e) => setFurnished(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any</option>
              <option value="furnished">Furnished</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="part_furnished">Part Furnished</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <span className="mr-2">{showAdvanced ? '▼' : '▶'}</span>
            Advanced Filters
          </button>
        </div>

        {/* Advanced Filters Section */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            {/* Lease Duration and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="lease-duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Lease Duration
                </label>
                <select
                  id="lease-duration"
                  value={leaseDurationType}
                  onChange={(e) => setLeaseDurationType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any Duration</option>
                  <option value="short_term">Short-term (&lt; 12 months)</option>
                  <option value="long_term">Long-term (12+ months)</option>
                </select>
              </div>

              <div>
                <label htmlFor="available-from" className="block text-sm font-medium text-gray-700 mb-1">
                  Available From
                </label>
                <input
                  type="date"
                  id="available-from"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  min={today}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="available-to" className="block text-sm font-medium text-gray-700 mb-1">
                  Available To
                </label>
                <input
                  type="date"
                  id="available-to"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                  min={availableFrom || today}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="viewing-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Viewing Type
                </label>
                <select
                  id="viewing-type"
                  value={viewingType}
                  onChange={(e) => setViewingType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any</option>
                  <option value="in_person">In-Person Only</option>
                  <option value="virtual">Virtual Only</option>
                  <option value="both">Both Options</option>
                </select>
              </div>
            </div>

            {/* Property Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="parking" className="block text-sm font-medium text-gray-700 mb-1">
                  Parking
                </label>
                <select
                  id="parking"
                  value={parkingType}
                  onChange={(e) => setParkingType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any</option>
                  <option value="street">Street Parking</option>
                  <option value="dedicated">Dedicated Spot</option>
                  <option value="garage">Garage</option>
                </select>
              </div>

              <div>
                <label htmlFor="outdoor-space" className="block text-sm font-medium text-gray-700 mb-1">
                  Outdoor Space
                </label>
                <select
                  id="outdoor-space"
                  value={outdoorSpace}
                  onChange={(e) => setOutdoorSpace(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any</option>
                  <option value="balcony">Balcony</option>
                  <option value="patio">Patio</option>
                  <option value="garden">Garden</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center space-x-6 pt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={petFriendly === true}
                    onChange={(e) => setPetFriendly(e.target.checked ? true : undefined)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Pet Friendly</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={billsIncluded === true}
                    onChange={(e) => setBillsIncluded(e.target.checked ? true : undefined)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Bills Included</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Search and Reset Buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Reset all filters
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Searching...
              </div>
            ) : (
              'Search Properties'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
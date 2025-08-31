'use client';

import { PropertyFilters } from '@/types/property';

interface FilterChipsProps {
  filters: PropertyFilters;
  onRemoveFilter: (key: keyof PropertyFilters) => void;
  onClearAll: () => void;
}

export default function FilterChips({ filters, onRemoveFilter, onClearAll }: FilterChipsProps) {
  // Format filter value for display
  const formatFilterValue = (key: string, value: any): string => {
    switch (key) {
      case 'county':
      case 'town':
        return value.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      case 'property_type':
        return value.charAt(0).toUpperCase() + value.slice(1);
      case 'bedrooms':
        return `${value} ${value === 1 ? 'bed' : 'beds'}`;
      case 'rent_max':
        return `Max €${value}`;
      case 'rent_min':
        return `Min €${value}`;
      case 'ber_rating':
        return `BER ${value}`;
      case 'furnished':
        return value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      case 'lease_duration_type':
        return value === 'short_term' ? 'Short-term' : 'Long-term';
      case 'available_from':
        return `From ${new Date(value).toLocaleDateString()}`;
      case 'available_to':
        return `Until ${new Date(value).toLocaleDateString()}`;
      case 'pet_friendly':
        return value ? 'Pet Friendly' : 'No Pets';
      case 'parking_type':
        const parkingLabels: Record<string, string> = {
          'street': 'Street Parking',
          'dedicated': 'Dedicated Parking',
          'garage': 'Garage'
        };
        return parkingLabels[value] || value;
      case 'outdoor_space':
        return value.charAt(0).toUpperCase() + value.slice(1);
      case 'bills_included':
        return value ? 'Bills Included' : 'Bills Not Included';
      case 'viewing_type':
        const viewingLabels: Record<string, string> = {
          'in_person': 'In-Person Viewing',
          'virtual': 'Virtual Viewing',
          'both': 'Both Viewing Types'
        };
        return viewingLabels[value] || value;
      case 'search':
        return `"${value}"`;
      default:
        return String(value);
    }
  };

  // Get human-readable filter name
  const getFilterLabel = (key: string): string => {
    const labels: Record<string, string> = {
      'county': 'County',
      'town': 'Town',
      'property_type': 'Type',
      'bedrooms': 'Bedrooms',
      'bedrooms_min': 'Min Beds',
      'bedrooms_max': 'Max Beds',
      'rent_min': 'Min Rent',
      'rent_max': 'Max Rent',
      'ber_rating': 'BER',
      'furnished': 'Furnishing',
      'lease_duration_type': 'Lease',
      'available_from': 'Available',
      'available_to': 'Available',
      'pet_friendly': 'Pets',
      'parking_type': 'Parking',
      'outdoor_space': 'Outdoor',
      'bills_included': 'Bills',
      'viewing_type': 'Viewing',
      'search': 'Search'
    };
    return labels[key] || key;
  };

  // Get active filters (excluding undefined values)
  const activeFilters = Object.entries(filters).filter(([_, value]) => 
    value !== undefined && value !== '' && value !== null
  );

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-gray-600 font-medium">Active filters:</span>
      
      {activeFilters.map(([key, value]) => (
        <div
          key={key}
          className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm"
        >
          <span className="font-medium mr-1">{getFilterLabel(key)}:</span>
          <span>{formatFilterValue(key, value)}</span>
          <button
            onClick={() => onRemoveFilter(key as keyof PropertyFilters)}
            className="ml-2 hover:text-blue-600 focus:outline-none"
            aria-label={`Remove ${getFilterLabel(key)} filter`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-gray-600 hover:text-gray-800 underline ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
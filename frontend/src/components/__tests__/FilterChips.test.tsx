import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterChips from '../FilterChips';
import '@testing-library/jest-dom';

describe('FilterChips', () => {
  const mockOnRemoveFilter = jest.fn();
  const mockOnClearAll = jest.fn();

  const defaultFilters = {
    county: '',
    town: '',
    property_type: '',
    bedrooms_min: '',
    bedrooms_max: '',
    rent_min: '',
    rent_max: '',
    ber_rating: '',
    furnished: '',
    lease_duration_type: '',
    available_from: '',
    available_to: '',
    pet_friendly: '',
    parking_type: '',
    outdoor_space: '',
    bills_included: '',
    viewing_type: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no filters are active', () => {
    const { container } = render(
      <FilterChips
        filters={defaultFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders chips for active filters', () => {
    const activeFilters = {
      ...defaultFilters,
      county: 'dublin',
      property_type: 'apartment',
      pet_friendly: 'true',
    };

    render(
      <FilterChips
        filters={activeFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('County: Dublin')).toBeInTheDocument();
    expect(screen.getByText('Type: Apartment')).toBeInTheDocument();
    expect(screen.getByText('Pet Friendly')).toBeInTheDocument();
  });

  it('displays formatted labels for filter values', () => {
    const activeFilters = {
      ...defaultFilters,
      property_type: 'house',
      furnished: 'part_furnished',
      lease_duration_type: 'short_term',
      parking_type: 'dedicated',
      outdoor_space: 'balcony',
      viewing_type: 'in_person',
    };

    render(
      <FilterChips
        filters={activeFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('Type: House')).toBeInTheDocument();
    expect(screen.getByText('Furnished: Part Furnished')).toBeInTheDocument();
    expect(screen.getByText('Lease: Short Term')).toBeInTheDocument();
    expect(screen.getByText('Parking: Dedicated')).toBeInTheDocument();
    expect(screen.getByText('Outdoor: Balcony')).toBeInTheDocument();
    expect(screen.getByText('Viewing: In Person')).toBeInTheDocument();
  });

  it('displays bedroom range correctly', () => {
    const singleBedroom = {
      ...defaultFilters,
      bedrooms_min: '2',
      bedrooms_max: '2',
    };

    const { rerender } = render(
      <FilterChips
        filters={singleBedroom}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('2 Bedrooms')).toBeInTheDocument();

    const bedroomRange = {
      ...defaultFilters,
      bedrooms_min: '2',
      bedrooms_max: '4',
    };

    rerender(
      <FilterChips
        filters={bedroomRange}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('2-4 Bedrooms')).toBeInTheDocument();
  });

  it('displays price range correctly', () => {
    const priceRange = {
      ...defaultFilters,
      rent_min: '1000',
      rent_max: '2000',
    };

    render(
      <FilterChips
        filters={priceRange}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('€1,000 - €2,000')).toBeInTheDocument();
  });

  it('displays only min price when max is not set', () => {
    const minOnly = {
      ...defaultFilters,
      rent_min: '1500',
    };

    render(
      <FilterChips
        filters={minOnly}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('€1,500+')).toBeInTheDocument();
  });

  it('displays only max price when min is not set', () => {
    const maxOnly = {
      ...defaultFilters,
      rent_max: '2500',
    };

    render(
      <FilterChips
        filters={maxOnly}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('Up to €2,500')).toBeInTheDocument();
  });

  it('displays date range correctly', () => {
    const dateRange = {
      ...defaultFilters,
      available_from: '2024-03-01',
      available_to: '2024-12-31',
    };

    render(
      <FilterChips
        filters={dateRange}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('From: Mar 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('To: Dec 31, 2024')).toBeInTheDocument();
  });

  it('displays BER rating correctly', () => {
    const berFilter = {
      ...defaultFilters,
      ber_rating: 'A1',
    };

    render(
      <FilterChips
        filters={berFilter}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('BER: A1')).toBeInTheDocument();
  });

  it('displays boolean filters correctly', () => {
    const booleanFilters = {
      ...defaultFilters,
      pet_friendly: 'true',
      bills_included: 'true',
    };

    render(
      <FilterChips
        filters={booleanFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('Pet Friendly')).toBeInTheDocument();
    expect(screen.getByText('Bills Included')).toBeInTheDocument();
  });

  it('calls onRemove with correct filter key when X is clicked', () => {
    const activeFilters = {
      ...defaultFilters,
      county: 'dublin',
      property_type: 'apartment',
      pet_friendly: 'true',
    };

    render(
      <FilterChips
        filters={activeFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    // Find and click the X button for county filter
    const countyChip = screen.getByText('County: Dublin').closest('span');
    const countyRemoveButton = countyChip?.querySelector('button');
    fireEvent.click(countyRemoveButton!);

    expect(mockOnRemoveFilter).toHaveBeenCalledWith('county');

    // Click remove for property type
    const typeChip = screen.getByText('Type: Apartment').closest('span');
    const typeRemoveButton = typeChip?.querySelector('button');
    fireEvent.click(typeRemoveButton!);

    expect(mockOnRemoveFilter).toHaveBeenCalledWith('property_type');
  });

  it('handles bedroom range removal correctly', () => {
    const bedroomFilters = {
      ...defaultFilters,
      bedrooms_min: '2',
      bedrooms_max: '3',
    };

    render(
      <FilterChips
        filters={bedroomFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    const bedroomChip = screen.getByText('2-3 Bedrooms').closest('span');
    const removeButton = bedroomChip?.querySelector('button');
    fireEvent.click(removeButton!);

    // Should call onRemove for both min and max
    expect(mockOnRemoveFilter).toHaveBeenCalledWith('bedrooms');
  });

  it('handles price range removal correctly', () => {
    const priceFilters = {
      ...defaultFilters,
      rent_min: '1000',
      rent_max: '2000',
    };

    render(
      <FilterChips
        filters={priceFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    const priceChip = screen.getByText('€1,000 - €2,000').closest('span');
    const removeButton = priceChip?.querySelector('button');
    fireEvent.click(removeButton!);

    expect(mockOnRemoveFilter).toHaveBeenCalledWith('price');
  });

  it('renders all chips in correct order', () => {
    const allFilters = {
      county: 'dublin',
      town: 'dublin-city',
      property_type: 'apartment',
      bedrooms_min: '2',
      bedrooms_max: '3',
      rent_min: '1500',
      rent_max: '2500',
      ber_rating: 'A1',
      furnished: 'furnished',
      lease_duration_type: 'long_term',
      available_from: '2024-03-01',
      available_to: '2024-12-31',
      pet_friendly: 'true',
      parking_type: 'dedicated',
      outdoor_space: 'balcony',
      bills_included: 'true',
      viewing_type: 'both',
    };

    render(
      <FilterChips
        filters={allFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    const chips = screen.getAllByRole('button', { name: /×/ });
    
    // Should render all active filters as chips
    expect(chips.length).toBeGreaterThan(10);
    
    // Verify some key chips are present
    expect(screen.getByText('County: Dublin')).toBeInTheDocument();
    expect(screen.getByText('Town: Dublin City')).toBeInTheDocument();
    expect(screen.getByText('Type: Apartment')).toBeInTheDocument();
    expect(screen.getByText('2-3 Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('€1,500 - €2,500')).toBeInTheDocument();
  });

  it('applies correct styling to chips', () => {
    const activeFilters = {
      ...defaultFilters,
      property_type: 'house',
    };

    render(
      <FilterChips
        filters={activeFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    const chip = screen.getByText('Type: House').closest('span');
    expect(chip).toHaveClass('inline-flex', 'items-center', 'gap-1', 'px-3', 'py-1', 'rounded-full');
    expect(chip).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('handles special formatting for town names', () => {
    const townFilter = {
      ...defaultFilters,
      town: 'dublin-city-centre',
    };

    render(
      <FilterChips
        filters={townFilter}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    // Should capitalize and format the town name
    expect(screen.getByText('Town: Dublin City Centre')).toBeInTheDocument();
  });

  it('does not render chips for empty string values', () => {
    const mixedFilters = {
      ...defaultFilters,
      county: 'dublin',
      property_type: '', // Empty string should not create a chip
      pet_friendly: 'false', // False boolean should not create a chip
      bills_included: 'true',
    };

    render(
      <FilterChips
        filters={mixedFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('County: Dublin')).toBeInTheDocument();
    expect(screen.getByText('Bills Included')).toBeInTheDocument();
    expect(screen.queryByText('Type:')).not.toBeInTheDocument();
    expect(screen.queryByText('Pet Friendly')).not.toBeInTheDocument();
  });

  it('handles multiple chips removal in sequence', () => {
    const activeFilters = {
      ...defaultFilters,
      county: 'dublin',
      property_type: 'apartment',
      pet_friendly: 'true',
    };

    const { rerender } = render(
      <FilterChips
        filters={activeFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    // Remove county
    const countyChip = screen.getByText('County: Dublin').closest('span');
    const countyRemoveButton = countyChip?.querySelector('button');
    fireEvent.click(countyRemoveButton!);

    expect(mockOnRemoveFilter).toHaveBeenCalledWith('county');

    // Simulate filter update after removal
    const updatedFilters = {
      ...activeFilters,
      county: '',
    };

    rerender(
      <FilterChips
        filters={updatedFilters}
        onRemoveFilter={mockOnRemoveFilter}
        onClearAll={mockOnClearAll}
      />
    );

    // County chip should be gone
    expect(screen.queryByText('County: Dublin')).not.toBeInTheDocument();
    // Other chips should still be present
    expect(screen.getByText('Type: Apartment')).toBeInTheDocument();
    expect(screen.getByText('Pet Friendly')).toBeInTheDocument();
  });
});
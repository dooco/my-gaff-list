import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedSearchBar from '../AdvancedSearchBar';
import '@testing-library/jest-dom';

// Mock the SearchAutocomplete component
jest.mock('../SearchAutocomplete', () => ({
  __esModule: true,
  default: ({ value, onChange, onSuggestionSelect }: any) => (
    <input
      data-testid="search-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search properties..."
    />
  ),
}));

// Mock the API module
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('AdvancedSearchBar', () => {
  const mockOnSearch = jest.fn();
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

  it('renders the search bar with basic elements', () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    expect(screen.getByTestId('search-autocomplete')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('toggles filter panel when filter button is clicked', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    const filterButton = screen.getByText('Filters');
    
    // Initially filters should be hidden
    expect(screen.queryByText('Location')).not.toBeInTheDocument();
    
    // Click to expand filters
    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(screen.getByText('Location')).toBeInTheDocument();
    });
    
    // Click to collapse filters
    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(screen.queryByText('Location')).not.toBeInTheDocument();
    });
  });

  it('calls onSearch with search term when search button is clicked', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    const searchInput = screen.getByTestId('search-autocomplete');
    const searchButton = screen.getByText('Search');

    await userEvent.type(searchInput, 'Dublin apartments');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Dublin apartments',
      })
    );
  });

  it('handles property type filter selection', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Property Type')).toBeInTheDocument();
    });

    // Select apartment
    const propertyTypeSection = screen.getByText('Property Type').closest('div');
    const apartmentButton = within(propertyTypeSection!).getByText('Apartment');
    
    fireEvent.click(apartmentButton);
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        property_type: 'apartment',
      })
    );
  });

  it('handles bedroom range selection', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Bedrooms')).toBeInTheDocument();
    });

    // Select 2-3 bedrooms
    const bedroomsSection = screen.getByText('Bedrooms').closest('div');
    const twoBedroomButton = within(bedroomsSection!).getByText('2');
    const threeBedroomButton = within(bedroomsSection!).getByText('3');
    
    fireEvent.click(twoBedroomButton);
    fireEvent.click(threeBedroomButton);
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        bedrooms_min: '2',
        bedrooms_max: '3',
      })
    );
  });

  it('handles price range input', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Price Range')).toBeInTheDocument();
    });

    const minPriceInput = screen.getByPlaceholderText('Min');
    const maxPriceInput = screen.getByPlaceholderText('Max');

    await userEvent.type(minPriceInput, '1000');
    await userEvent.type(maxPriceInput, '2000');
    
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        rent_min: '1000',
        rent_max: '2000',
      })
    );
  });

  it('handles lease duration type selection', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Lease Duration')).toBeInTheDocument();
    });

    const leaseDurationSection = screen.getByText('Lease Duration').closest('div');
    const shortTermButton = within(leaseDurationSection!).getByText('Short Term (<12 months)');
    
    fireEvent.click(shortTermButton);
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        lease_duration_type: 'short_term',
      })
    );
  });

  it('handles date range selection', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Availability')).toBeInTheDocument();
    });

    const fromDateInput = screen.getByLabelText('Available From');
    const toDateInput = screen.getByLabelText('Available To');

    fireEvent.change(fromDateInput, { target: { value: '2024-03-01' } });
    fireEvent.change(toDateInput, { target: { value: '2024-12-31' } });
    
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        available_from: '2024-03-01',
        available_to: '2024-12-31',
      })
    );
  });

  it('handles pet friendly toggle', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
    });

    const petFriendlyCheckbox = screen.getByRole('checkbox', { name: /pet friendly/i });
    
    fireEvent.click(petFriendlyCheckbox);
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        pet_friendly: 'true',
      })
    );
  });

  it('handles bills included toggle', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
    });

    const billsIncludedCheckbox = screen.getByRole('checkbox', { name: /bills included/i });
    
    fireEvent.click(billsIncludedCheckbox);
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        bills_included: 'true',
      })
    );
  });

  it('clears all filters when clear button is clicked', async () => {
    const filtersWithValues = {
      ...defaultFilters,
      property_type: 'apartment',
      rent_min: '1000',
      rent_max: '2000',
      pet_friendly: 'true',
    };

    render(
      <AdvancedSearchBar
        filters={filtersWithValues}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear All'));
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        property_type: '',
        rent_min: '',
        rent_max: '',
        pet_friendly: '',
      })
    );
  });

  it('displays filter count badge when filters are active', () => {
    const filtersWithValues = {
      ...defaultFilters,
      property_type: 'apartment',
      pet_friendly: 'true',
      rent_min: '1000',
    };

    render(
      <AdvancedSearchBar
        filters={filtersWithValues}
        onSearch={mockOnSearch}
      />
    );

    // Should show badge with count of 3
    const badge = screen.getByText('3');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-600');
  });

  it('handles BER rating selection', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('BER Rating')).toBeInTheDocument();
    });

    const berSection = screen.getByText('BER Rating').closest('div');
    const berA1Button = within(berSection!).getByText('A1');
    
    fireEvent.click(berA1Button);
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        ber_rating: 'A1',
      })
    );
  });

  it('handles parking type selection', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Parking')).toBeInTheDocument();
    });

    const parkingSection = screen.getByText('Parking').closest('div');
    const dedicatedButton = within(parkingSection!).getByText('Dedicated');
    
    fireEvent.click(dedicatedButton);
    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        parking_type: 'dedicated',
      })
    );
  });

  it('handles multiple filter selections', async () => {
    render(
      <AdvancedSearchBar
        filters={defaultFilters}
        onSearch={mockOnSearch}
      />
    );

    // Expand filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      expect(screen.getByText('Property Type')).toBeInTheDocument();
    });

    // Select multiple filters
    const propertyTypeSection = screen.getByText('Property Type').closest('div');
    fireEvent.click(within(propertyTypeSection!).getByText('House'));

    const bedroomsSection = screen.getByText('Bedrooms').closest('div');
    fireEvent.click(within(bedroomsSection!).getByText('3'));

    const petFriendlyCheckbox = screen.getByRole('checkbox', { name: /pet friendly/i });
    fireEvent.click(petFriendlyCheckbox);

    fireEvent.click(screen.getByText('Search'));

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        property_type: 'house',
        bedrooms_min: '3',
        bedrooms_max: '3',
        pet_friendly: 'true',
      })
    );
  });
});
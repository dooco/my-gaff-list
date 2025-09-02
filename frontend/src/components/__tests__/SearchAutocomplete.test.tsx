import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchAutocomplete from '../SearchAutocomplete';
import { propertySearchService } from '@/services/propertySearch';
import '@testing-library/jest-dom';

// Mock the property search service
jest.mock('@/services/propertySearch', () => ({
  propertySearchService: {
    searchSuggestions: jest.fn(),
  },
}));

// Mock the debounce to execute immediately in tests
jest.mock('lodash/debounce', () => 
  jest.fn((fn) => {
    fn.cancel = jest.fn();
    return fn;
  })
);

describe('SearchAutocomplete', () => {
  const mockOnChange = jest.fn();
  const mockOnSuggestionSelect = jest.fn();
  const mockSearchService = propertySearchService as jest.Mocked<typeof propertySearchService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the search input', () => {
    render(
      <SearchAutocomplete
        value=""
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByPlaceholderText('Search by location, property type, or features...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('displays the current value', () => {
    render(
      <SearchAutocomplete
        value="Dublin"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dublin');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when input value changes', async () => {
    render(
      <SearchAutocomplete
        value=""
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByPlaceholderText('Search by location, property type, or features...');
    await userEvent.type(input, 'Cork');

    expect(mockOnChange).toHaveBeenCalledTimes(4); // C, o, r, k
    expect(mockOnChange).toHaveBeenLastCalledWith('Cork');
  });

  it('fetches and displays suggestions when typing', async () => {
    const mockSuggestions = [
      'Dublin City',
      'Dublin apartments',
      'Dublin houses',
    ];

    mockSearchService.searchSuggestions.mockResolvedValueOnce(mockSuggestions);

    render(
      <SearchAutocomplete
        value="Dub"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dub');
    fireEvent.focus(input);

    // Wait for API call and suggestions to appear
    await waitFor(() => {
      expect(mockSearchService.searchSuggestions).toHaveBeenCalledWith('Dub');
    });

    await waitFor(() => {
      mockSuggestions.forEach((suggestion) => {
        expect(screen.getByText(suggestion)).toBeInTheDocument();
      });
    });
  });

  it('does not fetch suggestions for queries less than 3 characters', async () => {
    render(
      <SearchAutocomplete
        value="Du"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Du');
    fireEvent.focus(input);

    // Wait a bit to ensure no API call is made
    await waitFor(() => {
      expect(mockSearchService.searchSuggestions).not.toHaveBeenCalled();
    });
  });

  it('selects a suggestion when clicked', async () => {
    const mockSuggestions = ['Dublin City', 'Dublin apartments'];

    mockSearchService.searchSuggestions.mockResolvedValueOnce(mockSuggestions);

    render(
      <SearchAutocomplete
        value="Dub"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dub');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Dublin City')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dublin City'));

    expect(mockOnSuggestionSelect).toHaveBeenCalledWith('Dublin City');
    
    // Suggestions should be hidden after selection
    await waitFor(() => {
      expect(screen.queryByText('Dublin apartments')).not.toBeInTheDocument();
    });
  });

  it('navigates suggestions with keyboard', async () => {
    const mockSuggestions = ['Dublin City', 'Dublin apartments', 'Dublin houses'];

    mockSearchService.searchSuggestions.mockResolvedValueOnce(mockSuggestions);

    render(
      <SearchAutocomplete
        value="Dub"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dub');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Dublin City')).toBeInTheDocument();
    });

    // Navigate down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      const firstSuggestion = screen.getByText('Dublin City').closest('div');
      expect(firstSuggestion).toHaveClass('bg-gray-100');
    });

    // Navigate down again
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      const secondSuggestion = screen.getByText('Dublin apartments').closest('div');
      expect(secondSuggestion).toHaveClass('bg-gray-100');
    });

    // Navigate up
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    await waitFor(() => {
      const firstSuggestion = screen.getByText('Dublin City').closest('div');
      expect(firstSuggestion).toHaveClass('bg-gray-100');
    });

    // Select with Enter
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnSuggestionSelect).toHaveBeenCalledWith('Dublin City');
  });

  it('closes suggestions when Escape is pressed', async () => {
    const mockSuggestions = ['Dublin City'];

    mockSearchService.searchSuggestions.mockResolvedValueOnce(mockSuggestions);

    render(
      <SearchAutocomplete
        value="Dub"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dub');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Dublin City')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Dublin City')).not.toBeInTheDocument();
    });
  });

  it('hides suggestions when input loses focus', async () => {
    const mockSuggestions = ['Dublin City'];

    mockSearchService.searchSuggestions.mockResolvedValueOnce(mockSuggestions);

    render(
      <SearchAutocomplete
        value="Dub"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dub');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Dublin City')).toBeInTheDocument();
    });

    // Blur after a delay to allow click events to register
    fireEvent.blur(input);

    // Use setTimeout to simulate the delay in the component
    setTimeout(() => {
      expect(screen.queryByText('Dublin City')).not.toBeInTheDocument();
    }, 200);
  });

  it('shows loading state while fetching suggestions', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockSearchService.searchSuggestions.mockReturnValueOnce(promise);

    render(
      <SearchAutocomplete
        value="Dub"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dub');
    fireEvent.focus(input);

    // Check for loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise!({ data: { suggestions: ['Dublin City'] } });

    // Check that loading state is gone and suggestions appear
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Dublin City')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockSearchService.searchSuggestions.mockRejectedValueOnce(new Error('API Error'));

    render(
      <SearchAutocomplete
        value="Dub"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dub');
    fireEvent.focus(input);

    // Wait for the API call to fail
    await waitFor(() => {
      expect(mockSearchService.searchSuggestions).toHaveBeenCalled();
    });

    // Should not show any suggestions or errors to the user
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('cancels previous requests when typing quickly', async () => {
    const mockSuggestions1 = ['Dublin City'];
    const mockSuggestions2 = ['Cork City'];

    mockSearchService.searchSuggestions
      .mockResolvedValueOnce(mockSuggestions1)
      .mockResolvedValueOnce(mockSuggestions2);

    const { rerender } = render(
      <SearchAutocomplete
        value="Dub"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('Dub');
    fireEvent.focus(input);

    // Change value quickly
    rerender(
      <SearchAutocomplete
        value="Cor"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    await waitFor(() => {
      expect(mockSearchService.searchSuggestions).toHaveBeenLastCalledWith('Cor');
    });
  });

  it('shows no suggestions message when API returns empty array', async () => {
    mockSearchService.searchSuggestions.mockResolvedValueOnce([]);

    render(
      <SearchAutocomplete
        value="xyz123"
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    );

    const input = screen.getByDisplayValue('xyz123');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('No suggestions found')).toBeInTheDocument();
    });
  });

  it('applies custom className prop', () => {
    render(
      <SearchAutocomplete
        value=""
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
        className="custom-class"
      />
    );

    const container = screen.getByPlaceholderText('Search by location, property type, or features...').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('applies custom placeholder prop', () => {
    render(
      <SearchAutocomplete
        value=""
        onChange={mockOnChange}
        onSuggestionSelect={mockOnSuggestionSelect}
        placeholder="Custom placeholder"
      />
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });
});
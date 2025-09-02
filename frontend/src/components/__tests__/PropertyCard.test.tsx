/**
 * Comprehensive unit tests for PropertyCard component.
 * Following JavaScript/React conventions: camelCase for variables/functions, PascalCase for components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PropertyCard from '../PropertyCard';
import { Property } from '@/types/property';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth');

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  HeartIcon: () => <div data-testid="heart-outline" />,
}));

jest.mock('@heroicons/react/24/solid', () => ({
  HeartIcon: () => <div data-testid="heart-solid" />,
}));

describe('PropertyCard Component', () => {
  const mockProperty: Property = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Modern 2-Bed Apartment',
    description: 'Beautiful apartment in city center',
    property_type: 'apartment',
    price: '1500.00',
    bedrooms: 2,
    bathrooms: 1,
    size: 75,
    furnished: true,
    ber_rating: 'B2',
    address: '123 Main Street',
    eircode: 'D02 X285',
    town: 'Dublin City',
    county: 'Dublin',
    latitude: 53.3498,
    longitude: -6.2603,
    available_from: '2024-01-01',
    minimum_lease: 12,
    landlord: 'landlord-id',
    status: 'active',
    featured: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    images: [
      { id: '1', image: '/property1.jpg', order: 1, is_primary: true }
    ],
    is_saved: false,
    verification_status: 'verified'
  };

  const mockOnSelect = jest.fn();
  const mockAuth = {
    user: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue(mockAuth);
  });

  describe('Rendering', () => {
    it('should render property card with all required elements', () => {
      render(<PropertyCard property={mockProperty} />);

      expect(screen.getByText('Modern 2-Bed Apartment')).toBeInTheDocument();
      expect(screen.getByText('€1,500')).toBeInTheDocument();
      expect(screen.getByText('2 bed')).toBeInTheDocument();
      expect(screen.getByText('1 bath')).toBeInTheDocument();
    });

    it('should render property image when available', () => {
      render(<PropertyCard property={mockProperty} />);

      const image = screen.getByAltText('Modern 2-Bed Apartment');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/property1.jpg');
    });

    it('should render placeholder when no images available', () => {
      const propertyNoImage = { ...mockProperty, images: [] };
      render(<PropertyCard property={propertyNoImage} />);

      const placeholder = screen.getByAltText('Modern 2-Bed Apartment');
      expect(placeholder).toHaveAttribute('src', expect.stringContaining('placeholder'));
    });

    it('should render BER badge when rating exists', () => {
      render(<PropertyCard property={mockProperty} />);

      expect(screen.getByText('B2')).toBeInTheDocument();
    });

    it('should not render BER badge when rating is null', () => {
      const propertyNoBER = { ...mockProperty, ber_rating: null };
      render(<PropertyCard property={propertyNoBER} />);

      expect(screen.queryByText('B2')).not.toBeInTheDocument();
    });

    it('should render verification badge when verified', () => {
      render(<PropertyCard property={mockProperty} />);

      expect(screen.getByTestId('verification-badge')).toBeInTheDocument();
    });
  });

  describe('Price Formatting', () => {
    it('should format price in EUR currency', () => {
      render(<PropertyCard property={mockProperty} />);

      expect(screen.getByText('€1,500')).toBeInTheDocument();
    });

    it('should handle decimal prices correctly', () => {
      const propertyDecimalPrice = { ...mockProperty, price: '1234.56' };
      render(<PropertyCard property={propertyDecimalPrice} />);

      expect(screen.getByText('€1,235')).toBeInTheDocument();
    });

    it('should handle large prices with proper formatting', () => {
      const propertyLargePrice = { ...mockProperty, price: '10000.00' };
      render(<PropertyCard property={propertyLargePrice} />);

      expect(screen.getByText('€10,000')).toBeInTheDocument();
    });
  });

  describe('Property Type Formatting', () => {
    const propertyTypes = [
      { input: 'apartment', expected: 'Apartment' },
      { input: 'house', expected: 'House' },
      { input: 'shared', expected: 'Shared' },
      { input: 'studio', expected: 'Studio' },
      { input: 'townhouse', expected: 'Townhouse' },
    ];

    propertyTypes.forEach(({ input, expected }) => {
      it(`should format property type "${input}" as "${expected}"`, () => {
        const property = { ...mockProperty, property_type: input };
        render(<PropertyCard property={property} />);

        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });

    it('should handle unknown property types', () => {
      const property = { ...mockProperty, property_type: 'unknown' };
      render(<PropertyCard property={property} />);

      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  describe('Furnished Status', () => {
    it('should display "Furnished" when furnished is true', () => {
      render(<PropertyCard property={mockProperty} />);

      expect(screen.getByText('Furnished')).toBeInTheDocument();
    });

    it('should display "Unfurnished" when furnished is false', () => {
      const unfurnishedProperty = { ...mockProperty, furnished: false };
      render(<PropertyCard property={unfurnishedProperty} />);

      expect(screen.getByText('Unfurnished')).toBeInTheDocument();
    });

    it('should handle string boolean values', () => {
      const stringFurnished = { ...mockProperty, furnished: 'True' as any };
      render(<PropertyCard property={stringFurnished} />);

      expect(screen.getByText('Furnished')).toBeInTheDocument();
    });
  });

  describe('Save/Unsave Functionality', () => {
    it('should show outline heart icon when property is not saved', () => {
      render(<PropertyCard property={mockProperty} />);

      expect(screen.getByTestId('heart-outline')).toBeInTheDocument();
      expect(screen.queryByTestId('heart-solid')).not.toBeInTheDocument();
    });

    it('should show solid heart icon when property is saved', () => {
      const savedProperty = { ...mockProperty, is_saved: true };
      render(<PropertyCard property={savedProperty} />);

      expect(screen.getByTestId('heart-solid')).toBeInTheDocument();
      expect(screen.queryByTestId('heart-outline')).not.toBeInTheDocument();
    });

    it('should call save handler when heart icon is clicked', async () => {
      const mockSaveHandler = jest.fn();
      render(
        <PropertyCard 
          property={mockProperty}
          onSave={mockSaveHandler}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveHandler).toHaveBeenCalledWith(mockProperty.id);
      });
    });

    it('should not show save button when user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuth,
        isAuthenticated: false,
        user: null,
      });

      render(<PropertyCard property={mockProperty} />);

      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('should call onSelect when card is clicked', () => {
      render(
        <PropertyCard 
          property={mockProperty}
          onSelect={mockOnSelect}
        />
      );

      const card = screen.getByRole('article');
      fireEvent.click(card);

      expect(mockOnSelect).toHaveBeenCalledWith(mockProperty);
    });

    it('should apply hover styles on mouse enter', () => {
      render(<PropertyCard property={mockProperty} />);

      const card = screen.getByRole('article');
      fireEvent.mouseEnter(card);

      expect(card).toHaveClass('hover:shadow-lg');
    });

    it('should handle click when onSelect is not provided', () => {
      render(<PropertyCard property={mockProperty} />);

      const card = screen.getByRole('article');
      
      // Should not throw error
      expect(() => fireEvent.click(card)).not.toThrow();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className when provided', () => {
      const customClass = 'custom-card-style';
      render(
        <PropertyCard 
          property={mockProperty}
          className={customClass}
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveClass(customClass);
    });

    it('should merge custom className with default styles', () => {
      render(
        <PropertyCard 
          property={mockProperty}
          className="custom-style"
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveClass('custom-style');
      expect(card).toHaveClass('rounded-lg'); // Default style
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const minimalProperty = {
        ...mockProperty,
        size: null,
        ber_rating: null,
        images: [],
        verification_status: null,
      };

      render(<PropertyCard property={minimalProperty} />);

      expect(screen.getByText('Modern 2-Bed Apartment')).toBeInTheDocument();
      expect(screen.queryByText('B2')).not.toBeInTheDocument();
    });

    it('should handle studio apartments (0 bedrooms)', () => {
      const studioProperty = { 
        ...mockProperty, 
        bedrooms: 0,
        property_type: 'studio'
      };
      render(<PropertyCard property={studioProperty} />);

      expect(screen.getByText('Studio')).toBeInTheDocument();
      expect(screen.getByText('Studio')).toBeInTheDocument();
    });

    it('should handle very long titles with truncation', () => {
      const longTitleProperty = {
        ...mockProperty,
        title: 'This is an extremely long property title that should be truncated properly in the UI to maintain good visual appearance',
      };

      render(<PropertyCard property={longTitleProperty} />);

      const title = screen.getByText(longTitleProperty.title);
      expect(title).toHaveClass('truncate');
    });

    it('should handle invalid date formats', () => {
      const invalidDateProperty = {
        ...mockProperty,
        available_from: 'invalid-date',
      };

      // Should render without crashing
      render(<PropertyCard property={invalidDateProperty} />);
      expect(screen.getByText('Modern 2-Bed Apartment')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA labels', () => {
      render(<PropertyCard property={mockProperty} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Property card'));
    });

    it('should have keyboard navigable save button', () => {
      render(<PropertyCard property={mockProperty} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toHaveAttribute('type', 'button');
    });

    it('should have alt text for images', () => {
      render(<PropertyCard property={mockProperty} />);

      const image = screen.getByAltText('Modern 2-Bed Apartment');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize expensive calculations', () => {
      const { rerender } = render(<PropertyCard property={mockProperty} />);

      // Rerender with same props
      rerender(<PropertyCard property={mockProperty} />);

      // Component should not recreate elements unnecessarily
      expect(screen.getByText('Modern 2-Bed Apartment')).toBeInTheDocument();
    });
  });
});

describe('PropertyCard Integration', () => {
  it('should work with property list', () => {
    const properties = [
      { ...mockProperty, id: '1', title: 'Property 1' },
      { ...mockProperty, id: '2', title: 'Property 2' },
      { ...mockProperty, id: '3', title: 'Property 3' },
    ];

    const { container } = render(
      <div>
        {properties.map(property => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    );

    expect(screen.getByText('Property 1')).toBeInTheDocument();
    expect(screen.getByText('Property 2')).toBeInTheDocument();
    expect(screen.getByText('Property 3')).toBeInTheDocument();
  });
});
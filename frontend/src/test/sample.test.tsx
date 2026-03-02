/**
 * TEST-4: Sample Component Test
 * 
 * Example test demonstrating React Testing Library usage
 * with Vitest for the my-gaff-list frontend.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Simple component for testing
function SampleComponent({ message }: { message: string }) {
  return (
    <div role="alert">
      <h1>My Gaff List</h1>
      <p>{message}</p>
    </div>
  );
}

describe('Sample Component Tests', () => {
  it('renders the heading', () => {
    render(<SampleComponent message="Welcome!" />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Gaff List');
  });

  it('displays the provided message', () => {
    render(<SampleComponent message="Find your perfect home" />);
    
    expect(screen.getByText('Find your perfect home')).toBeInTheDocument();
  });

  it('has accessible alert role', () => {
    render(<SampleComponent message="Test" />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('Environment Tests', () => {
  it('has test environment configured', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('has vi mocks available', () => {
    expect(vi).toBeDefined();
    expect(vi.fn).toBeInstanceOf(Function);
  });
});

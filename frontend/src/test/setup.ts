/**
 * TEST-4: Test Setup
 * 
 * Global test setup for Vitest with React Testing Library.
 * Extends expect with DOM matchers and provides common mocks.
 */

import '@testing-library/jest-dom/vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Suppress console errors during tests (optional)
// Uncomment if you want cleaner test output
// beforeAll(() => {
//   vi.spyOn(console, 'error').mockImplementation(() => {});
// });
// 
// afterAll(() => {
//   vi.restoreAllMocks();
// });

// Global fetch mock reset between tests
afterEach(() => {
  vi.clearAllMocks();
});

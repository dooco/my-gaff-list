/**
 * TEST-4: Vitest Configuration
 * 
 * Configures Vitest for frontend testing with React Testing Library,
 * jsdom environment, and path aliases.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for DOM simulation
    environment: 'jsdom',
    
    // Enable global test functions (describe, it, expect)
    globals: true,
    
    // Setup files to run before tests
    setupFiles: ['./src/test/setup.ts'],
    
    // Include patterns for test files
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
    
    // CSS handling
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

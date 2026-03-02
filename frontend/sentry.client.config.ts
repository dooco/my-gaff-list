/**
 * ERR-1: Sentry Client Configuration
 * 
 * This file configures Sentry for the client-side (browser).
 * It captures JavaScript errors, performance metrics, and user sessions.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring sample rate (10% of transactions)
  tracesSampleRate: 0.1,
  
  // Session replay for debugging (1% of sessions, 100% on error)
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment configuration
  environment: process.env.NODE_ENV,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Disable debug mode in production
  debug: false,
  
  // Filter out common non-actionable errors
  ignoreErrors: [
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    // Browser extensions
    'ResizeObserver loop',
    // Third-party scripts
    /^Script error\.?$/,
  ],
  
  // Don't send PII
  sendDefaultPii: false,
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

/**
 * ERR-1: Sentry Server Configuration
 * 
 * This file configures Sentry for the server-side (Node.js).
 * It captures server-side errors, API route failures, and SSR issues.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring sample rate
  tracesSampleRate: 0.1,
  
  // Environment configuration
  environment: process.env.NODE_ENV,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Disable debug mode
  debug: false,
  
  // Don't send PII
  sendDefaultPii: false,
});

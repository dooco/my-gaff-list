/**
 * Token Storage Utility
 * 
 * CRITICAL-6: Secure token storage implementation
 * 
 * JWT tokens are now stored in httpOnly cookies set by the server.
 * This prevents XSS attacks from accessing tokens via JavaScript.
 * 
 * The frontend can no longer directly access tokens - they are automatically
 * sent with requests via credentials: 'include'.
 * 
 * User data can still be stored in localStorage for UI purposes.
 */

import { AuthTokens } from '@/types/auth';

const USER_KEY = 'user_data';
const AUTH_STATUS_KEY = 'auth_status';

export const tokenStorage = {
  /**
   * @deprecated Tokens are now stored in httpOnly cookies by the server.
   * This method is kept for backwards compatibility but should not be used.
   */
  setTokens(_tokens: AuthTokens): void {
    // No-op: Tokens are set via httpOnly cookies by the server
    console.warn('tokenStorage.setTokens is deprecated. Tokens are now stored in httpOnly cookies.');
  },

  /**
   * @deprecated Tokens are stored in httpOnly cookies and cannot be accessed by JavaScript.
   * Use the auth/cookie/status endpoint to check authentication status.
   */
  getAccessToken(): string | null {
    // Cannot access httpOnly cookies from JavaScript (that's the point!)
    console.warn('tokenStorage.getAccessToken is deprecated. Use auth status endpoint instead.');
    return null;
  },

  /**
   * @deprecated Tokens are stored in httpOnly cookies and cannot be accessed by JavaScript.
   */
  getRefreshToken(): string | null {
    // Cannot access httpOnly cookies from JavaScript
    console.warn('tokenStorage.getRefreshToken is deprecated. Use cookie refresh endpoint instead.');
    return null;
  },

  /**
   * @deprecated Tokens are stored in httpOnly cookies and cannot be accessed by JavaScript.
   */
  getTokens(): AuthTokens | null {
    console.warn('tokenStorage.getTokens is deprecated. Tokens are in httpOnly cookies.');
    return null;
  },

  /**
   * @deprecated Use the logout endpoint which clears cookies server-side.
   */
  removeTokens(): void {
    // Cookies are cleared by the server on logout
    console.warn('tokenStorage.removeTokens is deprecated. Use logout endpoint instead.');
  },

  // User data management (still uses localStorage - safe for non-sensitive UI data)
  setUser(user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
    }
  },

  getUser(): any | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  },

  removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(AUTH_STATUS_KEY);
    }
  },

  // Auth status (for quick UI checks - actual auth is via cookies)
  setAuthStatus(authenticated: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STATUS_KEY, authenticated ? 'true' : 'false');
    }
  },

  getAuthStatus(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTH_STATUS_KEY) === 'true';
    }
    return false;
  },

  // Complete cleanup
  clearAll(): void {
    this.removeUser();
    // Note: Actual tokens are cleared by server via cookie deletion
  },

  /**
   * @deprecated Token validation is now handled server-side.
   */
  isTokenExpired(_token: string): boolean {
    console.warn('tokenStorage.isTokenExpired is deprecated. Server handles token validation.');
    return false;
  },

  /**
   * @deprecated Token expiry is now handled server-side.
   */
  getTokenExpiry(_token: string): number | null {
    console.warn('tokenStorage.getTokenExpiry is deprecated. Server handles token expiry.');
    return null;
  },

  /**
   * @deprecated Auto-refresh is handled by the auth service using cookies.
   */
  shouldRefreshToken(): boolean {
    console.warn('tokenStorage.shouldRefreshToken is deprecated. Use auth service instead.');
    return false;
  }
};

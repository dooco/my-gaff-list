import { AuthTokens } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

export const tokenStorage = {
  // Token management
  setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    }
  },

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  },

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  },

  getTokens(): AuthTokens | null {
    const access = this.getAccessToken();
    const refresh = this.getRefreshToken();
    
    if (access && refresh) {
      return { access, refresh };
    }
    return null;
  },

  removeTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  // User data management
  setUser(user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
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
    }
  },

  // Complete cleanup
  clearAll(): void {
    this.removeTokens();
    this.removeUser();
  },

  // Token validation
  isTokenExpired(token: string): boolean {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  },

  // Get token expiry time
  getTokenExpiry(token: string): number | null {
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      return null;
    }
  },

  // Check if tokens need refresh (refresh if expiring in next 5 minutes)
  shouldRefreshToken(): boolean {
    const accessToken = this.getAccessToken();
    if (!accessToken) return false;
    
    const expiry = this.getTokenExpiry(accessToken);
    if (!expiry) return false;
    
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return expiry < fiveMinutesFromNow;
  }
};
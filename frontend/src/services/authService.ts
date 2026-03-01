/**
 * Authentication Service
 * 
 * CRITICAL-6: Updated to use httpOnly cookie-based authentication.
 * Tokens are stored in cookies by the server, not accessible via JavaScript.
 */

import { 
  LoginCredentials, 
  RegisterData, 
  LoginResponse, 
  RegisterResponse, 
  User, 
  DashboardStats,
  AuthTokens 
} from '@/types/auth';
import { tokenStorage } from '@/utils/tokenStorage';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Response type for cookie-based login (no tokens in body)
interface CookieLoginResponse {
  user: User;
  message: string;
}

// Response type for auth status check
interface AuthStatusResponse {
  authenticated: boolean;
  user: User | null;
}

class AuthService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Helper method to make authenticated requests
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      // CRITICAL-6: Include credentials for cookie-based auth
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    // Handle token expiration
    if (response.status === 401) {
      // Try to refresh token
      try {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request
          const retryResponse = await fetch(url, config);
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          return retryResponse.json();
        }
      } catch (refreshError) {
        // If refresh fails, clear stored data
        tokenStorage.clearAll();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // CRITICAL-6: Use cookie-based login endpoint
    const response = await fetch(`${this.baseUrl}/api/users/auth/cookie/login/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Invalid credentials');
    }

    const data: CookieLoginResponse = await response.json();

    // Store user data (tokens are in httpOnly cookies)
    tokenStorage.setUser(data.user);
    tokenStorage.setAuthStatus(true);

    // Return in the expected format (tokens are placeholder since they're in cookies)
    return {
      user: data.user,
      access: 'cookie', // Placeholder - actual token is in httpOnly cookie
      refresh: 'cookie',
    };
  }

  async register(data: RegisterData): Promise<RegisterResponse> {
    // First register the user
    const registerResponse = await this.makeRequest<{ id: number; email: string }>('/api/users/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Then login with the new credentials to set cookies
    const loginResponse = await this.login({
      email: data.email,
      password: data.password,
    });

    return loginResponse;
  }

  async refreshToken(): Promise<AuthTokens> {
    // CRITICAL-6: Use cookie-based refresh endpoint
    const response = await fetch(`${this.baseUrl}/api/users/auth/cookie/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    // Return placeholder tokens since actual tokens are in cookies
    return {
      access: 'cookie',
      refresh: 'cookie',
    };
  }

  async logout(): Promise<void> {
    try {
      // CRITICAL-6: Use cookie-based logout endpoint to clear server-side cookies
      await fetch(`${this.baseUrl}/api/users/auth/cookie/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    
    // Clear local storage
    tokenStorage.clearAll();
  }

  // Check authentication status via server
  async checkAuthStatus(): Promise<AuthStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/users/auth/cookie/status/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { authenticated: false, user: null };
    }

    const data: AuthStatusResponse = await response.json();
    
    // Update local storage based on server response
    if (data.authenticated && data.user) {
      tokenStorage.setUser(data.user);
      tokenStorage.setAuthStatus(true);
    } else {
      tokenStorage.clearAll();
    }

    return data;
  }

  // User profile methods
  async getCurrentUser(): Promise<User> {
    return this.makeRequest<User>('/api/users/profile/');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.makeRequest<User>('/api/users/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getUserProfileDetails(): Promise<any> {
    return this.makeRequest('/api/users/profile/details/');
  }

  async updateUserProfileDetails(data: any): Promise<any> {
    return this.makeRequest('/api/users/profile/details/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<{ detail: string }> {
    return this.makeRequest('/api/users/profile/change-password/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard and stats
  async getDashboardStats(): Promise<DashboardStats> {
    return this.makeRequest<DashboardStats>('/api/users/dashboard/stats/');
  }

  // Property interactions
  async togglePropertySave(propertyId: string): Promise<{
    saved: boolean;
    message: string;
  }> {
    return this.makeRequest(`/api/users/saved-properties/${propertyId}/toggle/`, {
      method: 'POST',
    });
  }

  async checkPropertySaved(propertyId: string): Promise<{ is_saved: boolean }> {
    return this.makeRequest(`/api/users/properties/${propertyId}/saved/`);
  }

  async getSavedProperties(): Promise<any[]> {
    return this.makeRequest('/api/users/saved-properties/');
  }

  async getUserEnquiries(): Promise<any[]> {
    return this.makeRequest('/api/users/enquiries/');
  }

  // Activity tracking
  async trackActivity(data: {
    activity_type: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; activity_id: number }> {
    return this.makeRequest('/api/users/track-activity/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Token management utilities
  isAuthenticated(): boolean {
    // Quick check from localStorage, but actual auth is verified server-side
    return tokenStorage.getAuthStatus();
  }

  getStoredUser(): User | null {
    return tokenStorage.getUser();
  }

  // Auto refresh token if needed (simplified - server handles actual expiry)
  async autoRefreshToken(): Promise<void> {
    try {
      await this.refreshToken();
    } catch (error) {
      console.error('Auto refresh failed:', error);
      this.logout();
    }
  }
}

export const authService = new AuthService();

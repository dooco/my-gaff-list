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
    const token = tokenStorage.getAccessToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    const response = await fetch(url, config);
    
    // Handle token expiration
    if (response.status === 401 && token) {
      // Try to refresh token
      try {
        await this.refreshToken();
        // Retry the original request with new token
        const newToken = tokenStorage.getAccessToken();
        if (newToken) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${newToken}`,
          };
          const retryResponse = await fetch(url, config);
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          return retryResponse.json();
        }
      } catch (refreshError) {
        // If refresh fails, clear tokens and throw error
        tokenStorage.clearAll();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.makeRequest<LoginResponse>('/api/users/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store tokens and user data
    tokenStorage.setTokens({
      access: response.access,
      refresh: response.refresh,
    });
    tokenStorage.setUser(response.user);

    return response;
  }

  async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await this.makeRequest<RegisterResponse>('/api/users/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store tokens and user data
    tokenStorage.setTokens({
      access: response.access,
      refresh: response.refresh,
    });
    tokenStorage.setUser(response.user);

    return response;
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/api/users/auth/login/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    // Update stored tokens
    const newTokens = {
      access: data.access,
      refresh: data.refresh || refreshToken, // Use new refresh token if provided
    };
    
    tokenStorage.setTokens(newTokens);
    return newTokens;
  }

  async logout(): Promise<void> {
    // Clear local storage
    tokenStorage.clearAll();
    
    // Optionally call server logout endpoint if implemented
    // await this.makeRequest('/users/auth/logout/', { method: 'POST' });
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
    const tokens = tokenStorage.getTokens();
    if (!tokens) return false;
    
    return !tokenStorage.isTokenExpired(tokens.access);
  }

  getStoredUser(): User | null {
    return tokenStorage.getUser();
  }

  // Auto refresh token if needed
  async autoRefreshToken(): Promise<void> {
    if (tokenStorage.shouldRefreshToken()) {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Auto refresh failed:', error);
        this.logout();
      }
    }
  }
}

export const authService = new AuthService();
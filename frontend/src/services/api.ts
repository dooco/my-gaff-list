/**
 * API Service
 * 
 * CRITICAL-6: Updated to use credentials: 'include' for httpOnly cookie auth.
 * Tokens are automatically sent via cookies, no manual header management needed.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      // CRITICAL-6: Include credentials to send/receive httpOnly cookies
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Handle errors
      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token via cookie endpoint
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry the request - cookies will be sent automatically
            const retryResponse = await fetch(url, config);
            if (retryResponse.ok) {
              return retryResponse.json();
            }
          }
          // Refresh failed - trigger logout
          throw new Error('Session expired. Please login again.');
        }
        
        const error = await response.text();
        throw new Error(error || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      // CRITICAL-6: Use cookie-based refresh endpoint
      const response = await fetch(`${BASE_URL}/api/users/auth/cookie/refresh/`, {
        method: 'POST',
        credentials: 'include', // Send refresh token cookie
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.makeRequest<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Export a singleton instance
export const api = new ApiService();

// Also export the class for custom instances
export default ApiService;

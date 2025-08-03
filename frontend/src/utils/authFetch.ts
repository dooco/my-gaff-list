import { tokenStorage } from './tokenStorage';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function authFetch(url: string, options: RequestInit = {}) {
  // Get current access token
  let accessToken = tokenStorage.getAccessToken();
  
  if (!accessToken) {
    throw new Error('No authentication token available');
  }

  // Make the request with the current access token
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // If we get a 401, try to refresh the token
  if (response.status === 401) {
    const refreshToken = tokenStorage.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('Session expired. Please log in again.');
    }

    try {
      // Try to refresh the token
      const refreshResponse = await fetch(`${BASE_URL}/api/auth/jwt/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token');
      }

      const { access } = await refreshResponse.json();
      
      // Store the new access token
      tokenStorage.setTokens({ access, refresh: refreshToken });
      
      // Retry the original request with the new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${access}`,
        },
      });
    } catch (error) {
      // If refresh fails, clear tokens and throw error
      tokenStorage.clearAll();
      throw new Error('Session expired. Please log in again.');
    }
  }

  return response;
}
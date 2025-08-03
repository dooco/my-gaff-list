// Utility to clear authentication tokens
export const clearAuthTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    console.log('Auth tokens cleared');
  }
};

// Run this in browser console to clear tokens:
// clearAuthTokens()
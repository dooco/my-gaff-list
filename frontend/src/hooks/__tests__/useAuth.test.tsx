/**
 * Comprehensive unit tests for useAuth hook.
 * Testing authentication functionality, state management, and edge cases.
 * Following JavaScript conventions: camelCase for variables/functions.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '@/contexts/AuthContext';
import * as authService from '@/services/auth';

// Mock the auth service
jest.mock('@/services/auth');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock fetch
global.fetch = jest.fn();

describe('useAuth Hook', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_type: 'renter',
    first_name: 'John',
    last_name: 'Doe',
  };

  const mockTokens = {
    access: 'mock-access-token',
    refresh: 'mock-refresh-token',
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  describe('Initial State', () => {
    it('should return initial state when not authenticated', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(true);
    });

    it('should load user from localStorage on mount', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'access_token') return mockTokens.access;
        if (key === 'refresh_token') return mockTokens.refresh;
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle invalid user data in localStorage', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return 'invalid-json';
        return null;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('Login Functionality', () => {
    it('should successfully login with valid credentials', async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'access_token',
        mockTokens.access
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'refresh_token',
        mockTokens.refresh
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockUser)
      );
    });

    it('should handle login failure with invalid credentials', async () => {
      const errorMessage = 'Invalid credentials';
      (authService.login as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('wrong@example.com', 'wrongpassword');
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      (authService.login as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password');
        } catch (error) {
          expect(error.message).toBe('Network error');
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should validate email format before login', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('invalid-email', 'password');
        } catch (error) {
          expect(error.message).toContain('Invalid email');
        }
      });

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should require password to be provided', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('test@example.com', '');
        } catch (error) {
          expect(error.message).toContain('Password required');
        }
      });

      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('Logout Functionality', () => {
    it('should successfully logout and clear state', async () => {
      // Setup authenticated state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'access_token') return mockTokens.access;
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });

    it('should call logout API endpoint', async () => {
      (authService.logout as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(authService.logout).toHaveBeenCalled();
    });

    it('should handle logout API errors gracefully', async () => {
      (authService.logout as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state even if API fails
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Registration Functionality', () => {
    const registrationData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      first_name: 'Jane',
      last_name: 'Smith',
      user_type: 'renter',
    };

    it('should successfully register a new user', async () => {
      const newUser = { ...mockUser, email: registrationData.email };
      (authService.register as jest.Mock).mockResolvedValue({
        user: newUser,
        tokens: mockTokens,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register(registrationData);
      });

      expect(result.current.user).toEqual(newUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle duplicate email registration', async () => {
      (authService.register as jest.Mock).mockRejectedValue(
        new Error('Email already exists')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.register(registrationData);
        } catch (error) {
          expect(error.message).toBe('Email already exists');
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should validate password strength', async () => {
      const weakPasswordData = { ...registrationData, password: '123' };

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.register(weakPasswordData);
        } catch (error) {
          expect(error.message).toContain('Password too weak');
        }
      });

      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('should refresh token when expired', async () => {
      const newTokens = {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue(newTokens);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'access_token',
        newTokens.access
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'refresh_token',
        newTokens.refresh
      );
    });

    it('should logout when refresh token fails', async () => {
      (authService.refreshToken as jest.Mock).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should get current access token', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'access_token') return mockTokens.access;
        return null;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.getAccessToken()).toBe(mockTokens.access);
    });

    it('should check if token is expired', () => {
      const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MDAwMDAwMDB9.test';
      const validToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.test';

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isTokenExpired(expiredToken)).toBe(true);
      expect(result.current.isTokenExpired(validToken)).toBe(false);
    });
  });

  describe('User Profile Updates', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, first_name: 'Johnny' };
      (authService.updateProfile as jest.Mock).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Set initial user
      await act(async () => {
        result.current.setUser(mockUser);
      });

      await act(async () => {
        await result.current.updateProfile({ first_name: 'Johnny' });
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(updatedUser)
      );
    });

    it('should handle profile update errors', async () => {
      (authService.updateProfile as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        result.current.setUser(mockUser);
      });

      await act(async () => {
        try {
          await result.current.updateProfile({ first_name: 'Johnny' });
        } catch (error) {
          expect(error.message).toBe('Update failed');
        }
      });

      // User should remain unchanged
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('Password Reset', () => {
    it('should request password reset successfully', async () => {
      (authService.requestPasswordReset as jest.Mock).mockResolvedValue({
        message: 'Reset email sent',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.requestPasswordReset('test@example.com');
        expect(response.message).toBe('Reset email sent');
      });

      expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    it('should reset password with valid token', async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue({
        message: 'Password reset successful',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.resetPassword('reset-token', 'NewPass123!');
        expect(response.message).toBe('Password reset successful');
      });
    });

    it('should handle invalid reset token', async () => {
      (authService.resetPassword as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired token')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.resetPassword('invalid-token', 'NewPass123!');
        } catch (error) {
          expect(error.message).toBe('Invalid or expired token');
        }
      });
    });
  });

  describe('Permission Checks', () => {
    it('should check if user has specific permission', () => {
      const landlordUser = { ...mockUser, user_type: 'landlord' };

      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.setUser(landlordUser);
      });

      expect(result.current.hasPermission('create_property')).toBe(true);
      expect(result.current.hasPermission('admin_access')).toBe(false);
    });

    it('should check if user is landlord', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.setUser({ ...mockUser, user_type: 'landlord' });
      });

      expect(result.current.isLandlord()).toBe(true);

      act(() => {
        result.current.setUser({ ...mockUser, user_type: 'renter' });
      });

      expect(result.current.isLandlord()).toBe(false);
    });

    it('should check if user is admin', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.setUser({ ...mockUser, user_type: 'admin' });
      });

      expect(result.current.isAdmin()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle simultaneous login attempts', async () => {
      (authService.login as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          user: mockUser,
          tokens: mockTokens,
        }), 100))
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      const promises = [
        result.current.login('test@example.com', 'password'),
        result.current.login('test@example.com', 'password'),
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      // Should only be logged in once
      expect(result.current.user).toEqual(mockUser);
      expect(authService.login).toHaveBeenCalledTimes(2);
    });

    it('should handle localStorage quota exceeded', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password');
        } catch (error) {
          expect(error.message).toContain('QuotaExceededError');
        }
      });
    });

    it('should handle missing localStorage', () => {
      const originalLocalStorage = window.localStorage;
      delete (window as any).localStorage;

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(() => result.current.getAccessToken()).not.toThrow();

      (window as any).localStorage = originalLocalStorage;
    });
  });
});
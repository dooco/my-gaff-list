import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { AuthContextType } from '@/types/auth';

// Re-export the useAuth hook for convenience
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Additional auth-related hooks

export function useAuthUser() {
  const { user, isAuthenticated } = useAuth();
  return { user, isAuthenticated };
}

export function useAuthActions() {
  const { login, register, logout, clearError, refreshUser } = useAuth();
  return { login, register, logout, clearError, refreshUser };
}

export function useAuthState() {
  const { isAuthenticated, isLoading, error } = useAuth();
  return { isAuthenticated, isLoading, error };
}
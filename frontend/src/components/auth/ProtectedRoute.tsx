'use client';

import { ReactNode, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from './AuthModal';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<'renter' | 'landlord' | 'agent' | 'admin'>;
  fallback?: ReactNode;
  redirectToLogin?: boolean;
  className?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles,
  fallback,
  redirectToLogin = true,
  className = ''
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    if (redirectToLogin) {
      return (
        <>
          <div className={`flex items-center justify-center min-h-64 ${className}`}>
            <div className="text-center max-w-md mx-auto p-6">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Authentication Required
              </h3>
              <p className="text-gray-600 mb-4">
                Please sign in to access this content.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </button>
            </div>
          </div>
          
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialMode="login"
          />
        </>
      );
    }

    return fallback || (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
          <p className="text-gray-600 mt-2">Please sign in to view this content.</p>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.user_type)) {
    return fallback || (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636 5.636 18.364" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-600 mt-2">
            You don't have permission to access this content.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Required roles: {allowedRoles.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <div className={className}>{children}</div>;
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Utility components for specific roles
export function RenterOnlyRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles'>) {
  return (
    <ProtectedRoute allowedRoles={['renter']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function LandlordOnlyRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles'>) {
  return (
    <ProtectedRoute allowedRoles={['landlord']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function AgentOnlyRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles'>) {
  return (
    <ProtectedRoute allowedRoles={['agent']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function LandlordOrAgentRoute({ children, ...props }: Omit<ProtectedRouteProps, 'allowedRoles'>) {
  return (
    <ProtectedRoute allowedRoles={['landlord', 'agent']} {...props}>
      {children}
    </ProtectedRoute>
  );
}
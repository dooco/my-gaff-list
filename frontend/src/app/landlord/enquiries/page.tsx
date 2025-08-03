'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function LandlordEnquiries() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Redirect to messages page
    if (!authLoading) {
      router.replace('/messages');
    }
  }, [authLoading, router]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Redirecting to messages...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  EnvelopeIcon 
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      setError('No verification token provided');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await api.post('/users/verification/email/verify/', {
        token
      });

      if (response.data.success) {
        setVerificationStatus('success');
        setMessage(response.data.message);
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setError(response.data.error || 'Verification failed');
      }
    } catch (err: any) {
      setVerificationStatus('error');
      setError(err.response?.data?.error || 'Failed to verify email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {verificationStatus === 'loading' && (
            <>
              <ArrowPathIcon className="mx-auto h-16 w-16 text-blue-600 animate-spin" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Verifying Your Email
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {verificationStatus === 'success' && (
            <>
              <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Email Verified!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Redirecting you to your dashboard...
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
            </>
          )}

          {verificationStatus === 'error' && (
            <>
              <XCircleIcon className="mx-auto h-16 w-16 text-red-600" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Verification Failed
              </h2>
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Go to Login
                </Link>
                <p className="text-sm text-gray-500">
                  If you need a new verification link, please log in to your account and request a new one.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
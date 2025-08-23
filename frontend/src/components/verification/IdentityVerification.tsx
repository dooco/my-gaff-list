'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  ShieldCheckIcon,
  DocumentCheckIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import VerificationStatusWidget from './VerificationStatusWidget';

interface VerificationStatus {
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  verification_level: 'none' | 'basic' | 'standard' | 'premium';
  trust_score: number;
  latest_identity_verification: {
    id: number;
    status: string;
    created_at: string;
    verified_at: string | null;
    expires_at: string | null;
    failure_reason: string | null;
    is_valid: boolean;
  } | null;
  can_verify: boolean;
  benefits: {
    trust_score: number;
    badge: string;
    features: string[];
  };
}

interface VerificationBenefits {
  current_level: string;
  current_trust_score: number;
  levels: {
    basic: { requirements: string; trust_score: number; benefits: string[] };
    standard: { requirements: string; trust_score: number; benefits: string[] };
    premium: { requirements: string; trust_score: number; benefits: string[] };
  };
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');

export default function IdentityVerification() {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [benefits, setBenefits] = useState<VerificationBenefits | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [showBenefits, setShowBenefits] = useState(false);
  const [modalState, setModalState] = useState<'closed' | 'loading' | 'open' | 'error'>('closed');
  const [resetting, setResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Check if user is authenticated before fetching
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      fetchVerificationStatus();
      fetchBenefits();
    } else {
      setLoading(false);
      setError('Please log in to access identity verification');
    }
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await api.get('/users/verification/identity/status/');
      setVerificationStatus(response.data);
      setError(''); // Clear any previous errors
    } catch (err: any) {
      console.error('Failed to fetch verification status:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Failed to load verification status. Please refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBenefits = async () => {
    try {
      const response = await api.get('/users/verification/identity/benefits/');
      setBenefits(response.data);
    } catch (err) {
      console.error('Failed to fetch benefits:', err);
    }
  };

  const resetVerification = async () => {
    setResetting(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/users/verification/identity/reset/');
      setSuccessMessage('Verification reset successfully. You can now start a new verification.');
      await fetchVerificationStatus();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError('Failed to reset verification. Please try again or contact support.');
    } finally {
      setResetting(false);
    }
  };

  const startVerification = async () => {
    setStarting(true);
    setError('');
    setSuccessMessage('');
    setModalState('loading');

    try {
      console.log('Starting verification process...');
      
      // Force refresh status first to ensure we have latest state
      await fetchVerificationStatus();
      
      // Check if we can actually verify
      if (!verificationStatus?.can_verify) {
        // Try to reset if stuck
        console.log('Cannot verify, attempting automatic reset...');
        try {
          await api.post('/users/verification/identity/reset/');
          await fetchVerificationStatus();
          setSuccessMessage('Previous session cleared. Starting new verification...');
        } catch (resetErr) {
          console.error('Auto-reset failed:', resetErr);
          setModalState('error');
          setError('Unable to start verification. Please use the Reset button below.');
          return;
        }
      }
      
      const response = await api.post('/users/verification/identity/create-session/', {
        return_url: `${window.location.origin}/account/verification/complete`,
        refresh_url: `${window.location.origin}/account/verification`
      });

      const { client_secret, session_id, existing } = response.data;
      console.log('Session created:', { session_id, existing, client_secret: client_secret?.substring(0, 20) + '...' });

      // Load Stripe and redirect to the verification session
      const stripe = await stripePromise;
      if (!stripe) {
        setModalState('error');
        throw new Error('Unable to load verification system. Please check your connection and try again.');
      }

      console.log('Stripe loaded, opening verification modal...');
      setModalState('open');
      
      // Set a timeout to detect if modal doesn't open
      const modalTimeout = setTimeout(() => {
        if (modalState === 'open') {
          setModalState('error');
          setError('Verification modal failed to open. Please disable popup blockers and try again.');
        }
      }, 5000);
      
      // Open Stripe Identity verification modal
      const { error } = await stripe.verifyIdentity(client_secret);
      
      clearTimeout(modalTimeout);
      setModalState('closed');
      
      if (error) {
        console.error('Stripe verification error:', error);
        setError(error.message || 'Verification failed. Please try again.');
      } else {
        console.log('Verification modal closed successfully');
        setSuccessMessage('Verification session completed. Checking status...');
        // Refresh status after modal closes
        await fetchVerificationStatus();
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setModalState('closed');
      const errorMessage = err.response?.data?.error || err.message || 'Failed to start verification';
      
      // Provide specific error messages
      if (errorMessage.toLowerCase().includes('verification') && errorMessage.toLowerCase().includes('progress')) {
        setError('A verification is already in progress. Use the Reset button below to start a new one.');
      } else if (errorMessage.toLowerCase().includes('stripe')) {
        setError('Unable to connect to verification service. Please check your internet connection.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setStarting(false);
      if (modalState === 'loading' || modalState === 'open') {
        setModalState('closed');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      case 'processing':
      case 'requires_input':
        return <ArrowPathIcon className="w-6 h-6 text-blue-500 animate-spin" />;
      default:
        return <InformationCircleIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  const getVerificationLevelBadge = (level: string, score: number) => {
    const badges = {
      premium: { color: 'bg-green-100 text-green-800', icon: '✓✓✓', label: 'Fully Verified' },
      standard: { color: 'bg-blue-100 text-blue-800', icon: '✓✓', label: 'Phone Verified' },
      basic: { color: 'bg-yellow-100 text-yellow-800', icon: '✓', label: 'Email Verified' },
      none: { color: 'bg-gray-100 text-gray-800', icon: '○', label: 'Not Verified' }
    };

    const badge = badges[level as keyof typeof badges] || badges.none;

    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
          <span className="mr-1">{badge.icon}</span>
          {badge.label}
        </span>
        <span className="text-sm text-gray-500">Trust Score: {score}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!verificationStatus) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-800">Unable to load verification status</p>
      </div>
    );
  }

  return (
    <>
      <VerificationStatusWidget />
      <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Verification Status</h3>
          {getVerificationLevelBadge(verificationStatus.verification_level, verificationStatus.trust_score)}
        </div>

        <div className="space-y-3">
          {/* Email Verification */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">Email Verification</span>
            </div>
            {verificationStatus.email_verified ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <span className="text-xs text-gray-500">Not verified</span>
            )}
          </div>

          {/* Phone Verification */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">Phone Verification</span>
            </div>
            {verificationStatus.phone_verified ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <span className="text-xs text-gray-500">Not verified</span>
            )}
          </div>

          {/* Identity Verification */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">Identity Verification</span>
            </div>
            {verificationStatus.identity_verified ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : (
              <span className="text-xs text-gray-500">Not verified</span>
            )}
          </div>
        </div>

        {/* Latest Verification Attempt */}
        {verificationStatus.latest_identity_verification && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Latest verification attempt</span>
              {getStatusIcon(verificationStatus.latest_identity_verification.status)}
            </div>
            {verificationStatus.latest_identity_verification.failure_reason && (
              <p className="mt-2 text-sm text-red-600">
                {verificationStatus.latest_identity_verification.failure_reason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircleIcon className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Modal Loading State */}
      {modalState === 'loading' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-800">Preparing verification system...</p>
          </div>
        </div>
      )}

      {modalState === 'open' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-800">Verification in progress. Please complete the steps in the popup window.</p>
          </div>
        </div>
      )}

      {/* Verification Action */}
      {!verificationStatus.identity_verified && verificationStatus.can_verify && (
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Complete Identity Verification
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Verify your identity to unlock premium features and build trust with other users.
                The process is quick, secure, and only takes a few minutes.
              </p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DocumentCheckIcon className="w-4 h-4" />
                  <span>Government-issued ID verification</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CameraIcon className="w-4 h-4" />
                  <span>Selfie with liveness detection</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Secure and encrypted process</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={startVerification}
                  disabled={starting || modalState !== 'closed'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {starting ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="w-4 h-4" />
                      Start Verification
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowBenefits(!showBenefits)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <InformationCircleIcon className="w-4 h-4" />
                  View Benefits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Having Trouble? Section - Show when not verified and has previous attempts */}
      {!verificationStatus.identity_verified && verificationStatus.latest_identity_verification && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <InformationCircleIcon className="w-8 h-8 text-gray-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Having Trouble?
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                If you're experiencing issues with verification, try these options:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={resetVerification}
                  disabled={resetting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {resetting ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-4 h-4" />
                      Reset Verification
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Refresh Page
                </button>
                
                <button
                  onClick={() => fetchVerificationStatus()}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Check Status
                </button>
                
                <a
                  href="mailto:support@mygafflist.com"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm text-center"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  Contact Support
                </a>
              </div>
              
              {verificationStatus.latest_identity_verification.status && (
                <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last attempt status:</span>
                    <span className="font-medium text-gray-900">
                      {verificationStatus.latest_identity_verification.status}
                    </span>
                  </div>
                  {verificationStatus.latest_identity_verification.created_at && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-600">Started:</span>
                      <span className="text-gray-900">
                        {new Date(verificationStatus.latest_identity_verification.created_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {verificationStatus.identity_verified && (
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Identity Verified
              </h4>
              <p className="text-sm text-gray-600">
                Your identity has been successfully verified. You now have access to all premium features
                and your profile displays a verified badge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      {showBenefits && benefits && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Benefits</h3>
          
          <div className="space-y-4">
            {Object.entries(benefits.levels).map(([level, info]) => (
              <div
                key={level}
                className={`border rounded-lg p-4 ${
                  verificationStatus.verification_level === level
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 capitalize">{level}</h4>
                  <span className="text-sm text-gray-500">Trust Score: {info.trust_score}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{info.requirements}</p>
                <ul className="space-y-1">
                  {info.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <ChevronRightIcon className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
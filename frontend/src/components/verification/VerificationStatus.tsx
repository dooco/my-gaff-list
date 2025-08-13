'use client';

import { useState, useEffect } from 'react';
import { 
  CheckBadgeIcon, 
  ExclamationTriangleIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface VerificationData {
  email_verified: boolean;
  phone_verified: boolean;
  identity_verifications: Array<{
    verification_type: string;
    status: string;
    verified_at: string | null;
  }>;
  verification_level: 'none' | 'email' | 'phone' | 'identity';
}

export default function VerificationStatus() {
  const { user, refreshUser } = useAuth();
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPhone, setSendingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await api.get('/users/verification/status/');
      setVerificationData(response.data);
    } catch (err) {
      console.error('Failed to fetch verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendEmailVerification = async () => {
    setSendingEmail(true);
    setMessage('');
    setError('');
    
    try {
      const response = await api.post('/users/verification/email/send/');
      setMessage(response.data.message);
      
      // Refresh after 5 seconds
      setTimeout(() => {
        fetchVerificationStatus();
        refreshUser();
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification email');
    } finally {
      setSendingEmail(false);
    }
  };

  const sendPhoneVerification = async () => {
    if (!phoneNumber) {
      setError('Please enter a phone number');
      return;
    }

    setSendingPhone(true);
    setMessage('');
    setError('');
    
    try {
      const response = await api.post('/users/verification/phone/send/', {
        phone_number: phoneNumber
      });
      setMessage(response.data.message);
      setShowCodeInput(true);
      setShowPhoneInput(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSendingPhone(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setSendingPhone(true);
    setMessage('');
    setError('');
    
    try {
      const response = await api.post('/users/verification/phone/verify/', {
        code: verificationCode
      });
      setMessage(response.data.message);
      
      // Refresh verification status
      fetchVerificationStatus();
      refreshUser();
      
      // Reset form
      setShowCodeInput(false);
      setPhoneNumber('');
      setVerificationCode('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify phone number');
    } finally {
      setSendingPhone(false);
    }
  };

  const initiateIdentityVerification = async () => {
    try {
      const response = await api.post('/users/verification/identity/initiate/', {
        verification_type: 'document'
      });
      
      // In production, this would redirect to Stripe Identity or another provider
      setMessage('Identity verification initiated. You will be redirected to complete verification.');
      
      // For now, just show the message
      console.log('Verification URL:', response.data.verification_url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate identity verification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  const getVerificationLevelColor = (level: string) => {
    switch (level) {
      case 'identity': return 'text-green-600 bg-green-50';
      case 'phone': return 'text-blue-600 bg-blue-50';
      case 'email': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getVerificationLevelLabel = (level: string) => {
    switch (level) {
      case 'identity': return 'Fully Verified';
      case 'phone': return 'Phone Verified';
      case 'email': return 'Email Verified';
      default: return 'Unverified';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Account Verification
      </h3>

      {/* Overall Status */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getVerificationLevelColor(verificationData?.verification_level || 'none')}`}>
          {verificationData?.verification_level === 'identity' && <CheckBadgeIcon className="h-4 w-4 mr-1" />}
          {getVerificationLevelLabel(verificationData?.verification_level || 'none')}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Verification Items */}
      <div className="space-y-4">
        {/* Email Verification */}
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Email Verification
              </p>
              <p className="text-sm text-gray-500">
                {user?.email}
              </p>
            </div>
          </div>
          {verificationData?.email_verified ? (
            <CheckBadgeIcon className="h-5 w-5 text-green-600" />
          ) : (
            <button
              onClick={sendEmailVerification}
              disabled={sendingEmail}
              className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              {sendingEmail ? 'Sending...' : 'Send Verification'}
            </button>
          )}
        </div>

        {/* Phone Verification */}
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Phone Verification
              </p>
              <p className="text-sm text-gray-500">
                {user?.phone_number || 'Not provided'}
              </p>
            </div>
          </div>
          {verificationData?.phone_verified ? (
            <CheckBadgeIcon className="h-5 w-5 text-green-600" />
          ) : (
            <div>
              {!showPhoneInput && !showCodeInput && (
                <button
                  onClick={() => setShowPhoneInput(true)}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Verify Phone
                </button>
              )}
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        {showPhoneInput && (
          <div className="ml-8 mt-2 space-y-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+353 87 123 4567"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex space-x-2">
              <button
                onClick={sendPhoneVerification}
                disabled={sendingPhone}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingPhone ? 'Sending...' : 'Send Code'}
              </button>
              <button
                onClick={() => {
                  setShowPhoneInput(false);
                  setPhoneNumber('');
                }}
                className="px-3 py-1 text-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Verification Code Input */}
        {showCodeInput && (
          <div className="ml-8 mt-2 space-y-2">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex space-x-2">
              <button
                onClick={verifyPhoneCode}
                disabled={sendingPhone}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingPhone ? 'Verifying...' : 'Verify'}
              </button>
              <button
                onClick={() => {
                  setShowCodeInput(false);
                  setVerificationCode('');
                }}
                className="px-3 py-1 text-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Identity Verification */}
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <IdentificationIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Identity Verification
              </p>
              <p className="text-sm text-gray-500">
                Government ID & selfie verification
              </p>
            </div>
          </div>
          {verificationData?.identity_verifications?.some(v => v.status === 'verified') ? (
            <CheckBadgeIcon className="h-5 w-5 text-green-600" />
          ) : verificationData?.identity_verifications?.some(v => v.status === 'processing') ? (
            <span className="text-sm text-yellow-600">Processing</span>
          ) : (
            <button
              onClick={initiateIdentityVerification}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Start Verification
            </button>
          )}
        </div>
      </div>

      {/* Benefits of Verification */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Benefits of Verification
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Build trust with landlords and tenants</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Access premium features</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Priority support and assistance</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Verified badge on your profile</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
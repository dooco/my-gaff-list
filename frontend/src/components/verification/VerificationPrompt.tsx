'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface VerificationPromptProps {
  userType?: 'landlord' | 'agent' | 'renter';
  dismissible?: boolean;
  style?: 'banner' | 'card' | 'inline';
}

export default function VerificationPrompt({
  userType,
  dismissible = true,
  style = 'banner'
}: VerificationPromptProps) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState<string>('none');
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if user should see the prompt
    checkPromptStatus();
  }, [user]);

  const checkPromptStatus = async () => {
    if (!user) return;

    try {
      const response = await api.get('/users/verification/identity/status/');
      const { verification_level, identity_verified } = response.data;
      
      setVerificationLevel(verification_level);
      
      // Don't show if already fully verified
      if (identity_verified || verification_level === 'premium') {
        setShouldShow(false);
        return;
      }

      // Check if prompt was recently dismissed
      const dismissedAt = localStorage.getItem('verification_prompt_dismissed');
      if (dismissedAt) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        
        // Show again after different periods based on user type
        const daysBeforeShowAgain = {
          landlord: 14,
          agent: 7,
          renter: 30
        };
        
        if (daysSinceDismissed < (daysBeforeShowAgain[userType || 'renter'] || 30)) {
          setShouldShow(false);
          return;
        }
      }

      // Check account age
      const accountAge = user.created_at ? 
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
      
      // Show prompt based on user type and account age
      const showAfterDays = {
        landlord: 7,
        agent: 3,
        renter: 30
      };
      
      setShouldShow(accountAge >= (showAfterDays[userType || 'renter'] || 30));
    } catch (err) {
      console.error('Failed to check prompt status:', err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShouldShow(false);
    localStorage.setItem('verification_prompt_dismissed', Date.now().toString());
  };

  if (!shouldShow || dismissed) {
    return null;
  }

  const benefits = {
    landlord: [
      'Get a verified badge on your properties',
      'Increase tenant trust and inquiries',
      'Priority customer support',
      'Featured listings in search results'
    ],
    agent: [
      'Professional verification badge',
      'Build trust with clients',
      'Access to advanced analytics',
      'Priority listing placement'
    ],
    renter: [
      'Stand out to landlords',
      'Priority messaging',
      'Exclusive verified-only properties',
      'Faster application processing'
    ]
  };

  const userBenefits = benefits[userType || 'renter'] || benefits.renter;

  if (style === 'banner') {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex-1 flex items-center">
              <ShieldCheckIcon className="h-6 w-6 mr-3 flex-shrink-0" />
              <p className="font-medium">
                <span className="md:hidden">Verify your identity for premium features</span>
                <span className="hidden md:inline">
                  Complete identity verification to unlock premium features and build trust
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2 sm:mt-0">
              <Link
                href="/account/verification"
                className="bg-white text-blue-600 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Get Verified
              </Link>
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-white hover:text-blue-200 transition-colors"
                  aria-label="Dismiss"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === 'card') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Boost Your Profile with Verification
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Join thousands of verified users enjoying premium benefits
                </p>
              </div>
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Dismiss"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <ul className="space-y-2 mb-4">
              {userBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <SparklesIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            
            <div className="flex gap-3">
              <Link
                href="/account/verification"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Start Verification
              </Link>
              <Link
                href="/help/verification"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline style
  return (
    <div className="inline-flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg">
      <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
      <span className="text-sm text-gray-700">
        Verify your identity for premium features
      </span>
      <Link
        href="/account/verification"
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Get Verified →
      </Link>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 ml-2"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
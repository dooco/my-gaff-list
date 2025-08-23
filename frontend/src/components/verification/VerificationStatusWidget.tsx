'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon, 
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

interface SessionHealth {
  healthy: boolean | 'warning';
  message: string;
  can_start_new: boolean;
  action_required?: string;
  session_age_minutes?: number;
  time_remaining_seconds?: number;
}

export default function VerificationStatusWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionHealth, setSessionHealth] = useState<SessionHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Only check health if we have an auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      checkHealth();
      const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // Update countdown timer
    if (sessionHealth?.time_remaining_seconds) {
      setTimeRemaining(sessionHealth.time_remaining_seconds);
      
      const countdown = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev > 0) {
            return prev - 1;
          }
          return null;
        });
      }, 1000);
      
      return () => clearInterval(countdown);
    }
  }, [sessionHealth?.time_remaining_seconds]);

  const checkHealth = async () => {
    try {
      // Check if we have authentication
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) {
        // User not authenticated, don't show widget
        setSessionHealth(null);
        return;
      }
      
      const response = await api.get('/users/verification/identity/health/');
      setSessionHealth(response.data);
    } catch (err: any) {
      // If unauthorized, hide the widget
      if (err.response?.status === 401 || err.response?.status === 403) {
        setSessionHealth(null);
      } else {
        console.error('Failed to check session health:', err);
      }
    }
  };

  const resetVerification = async () => {
    setLoading(true);
    try {
      await api.post('/users/verification/identity/reset/');
      await checkHealth();
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionHealth || sessionHealth.message === 'No active verification session') {
    return null; // Don't show widget if no active session
  }

  const getStatusColor = () => {
    if (sessionHealth.healthy === false) return 'bg-red-500';
    if (sessionHealth.healthy === 'warning') return 'bg-yellow-500';
    if (sessionHealth.message.includes('verified')) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = () => {
    if (sessionHealth.healthy === false) return <ExclamationTriangleIcon className="w-5 h-5" />;
    if (sessionHealth.healthy === 'warning') return <ClockIcon className="w-5 h-5" />;
    if (sessionHealth.message.includes('verified')) return <CheckCircleIcon className="w-5 h-5" />;
    return <ShieldCheckIcon className="w-5 h-5" />;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`${getStatusColor()} text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2`}
        >
          {getStatusIcon()}
          {timeRemaining && timeRemaining < 900 && ( // Show timer if less than 15 minutes
            <span className="text-xs font-mono">{formatTime(timeRemaining)}</span>
          )}
        </button>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {getStatusIcon()}
              Verification Status
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className={`p-2 rounded ${
              sessionHealth.healthy === false ? 'bg-red-50 text-red-800' :
              sessionHealth.healthy === 'warning' ? 'bg-yellow-50 text-yellow-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              <p className="text-sm font-medium">{sessionHealth.message}</p>
            </div>

            {timeRemaining && (
              <div className="bg-gray-50 p-2 rounded">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Time remaining:</span>
                  <span className={`font-mono font-medium ${
                    timeRemaining < 300 ? 'text-red-600' :
                    timeRemaining < 900 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                {timeRemaining < 300 && (
                  <p className="text-xs text-red-600 mt-1">
                    Session expiring soon!
                  </p>
                )}
              </div>
            )}

            {sessionHealth.session_age_minutes && (
              <div className="text-xs text-gray-500">
                Session age: {sessionHealth.session_age_minutes} minutes
              </div>
            )}

            {sessionHealth.action_required === 'reset' && (
              <button
                onClick={resetVerification}
                disabled={loading}
                className="w-full mt-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-4 h-4" />
                    Reset Session
                  </>
                )}
              </button>
            )}

            {sessionHealth.action_required === 'complete_soon' && (
              <div className="mt-2 p-2 bg-yellow-100 rounded">
                <p className="text-xs text-yellow-800">
                  Please complete verification soon to avoid session expiry.
                </p>
              </div>
            )}

            <button
              onClick={checkHealth}
              className="w-full mt-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-sm"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
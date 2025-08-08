'use client';

import React, { useEffect, useState } from 'react';
import { enhancedWebSocketService } from '@/services/websocketEnhanced';
import { WifiIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'fallback';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export default function ConnectionStatus({ showDetails = false, className = '' }: ConnectionStatusProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [latency, setLatency] = useState<number>(0);
  const [messageCount, setMessageCount] = useState<{ sent: number; received: number }>({
    sent: 0,
    received: 0,
  });
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = enhancedWebSocketService.subscribeToHealth((health) => {
      // Determine connection state
      if (health.connected) {
        setConnectionState('connected');
      } else if (enhancedWebSocketService.isFallbackMode()) {
        setConnectionState('fallback');
      } else if (health.connectionAttempts > 0 && !health.connected) {
        setConnectionState('connecting');
      } else {
        setConnectionState('disconnected');
      }

      // Update metrics
      setLatency(health.latency);
      setMessageCount({
        sent: health.messagesSent,
        received: health.messagesReceived,
      });

      // Get last error if any
      if (health.errors.length > 0) {
        setLastError(health.errors[health.errors.length - 1].error);
      }
    });

    return unsubscribe;
  }, []);

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <WifiIcon className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <WifiIcon className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'fallback':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'fallback':
        return 'Limited Mode';
      case 'disconnected':
        return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'fallback':
        return 'text-orange-600';
      case 'disconnected':
        return 'text-red-600';
    }
  };

  const handleReconnect = () => {
    enhancedWebSocketService.reconnect();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {showDetails && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {connectionState === 'connected' && latency > 0 && (
            <span>Latency: {latency}ms</span>
          )}
          {(connectionState === 'connected' || connectionState === 'fallback') && (
            <span>
              Messages: ↑{messageCount.sent} ↓{messageCount.received}
            </span>
          )}
          {connectionState === 'fallback' && (
            <span className="text-orange-600">Using HTTP fallback</span>
          )}
        </div>
      )}

      {(connectionState === 'disconnected' || connectionState === 'fallback') && (
        <button
          onClick={handleReconnect}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Reconnect
        </button>
      )}

      {lastError && connectionState === 'disconnected' && (
        <div className="text-xs text-red-500">
          Error: {lastError}
        </div>
      )}
    </div>
  );
}
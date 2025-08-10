import React from 'react';
import { ConnectionState } from '@/services/websocket';
import { 
  WifiIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { WifiIcon as WifiIconSolid } from '@heroicons/react/24/solid';

interface EnhancedConnectionStatusProps {
  connectionState: ConnectionState;
  onRetry?: () => void;
  showDetails?: boolean;
  className?: string;
}

export default function EnhancedConnectionStatus({ 
  connectionState, 
  onRetry,
  showDetails = true,
  className = ''
}: EnhancedConnectionStatusProps) {
  const getStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'text-green-600';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'text-yellow-600';
      case ConnectionState.DISCONNECTED:
        return 'text-gray-500';
      case ConnectionState.ERROR:
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return <WifiIconSolid className="h-4 w-4" />;
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return <ArrowPathIcon className="h-4 w-4 animate-spin" />;
      case ConnectionState.DISCONNECTED:
        return <WifiIcon className="h-4 w-4" />;
      case ConnectionState.ERROR:
        return <ExclamationCircleIcon className="h-4 w-4" />;
      default:
        return <WifiIcon className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.RECONNECTING:
        return 'Reconnecting...';
      case ConnectionState.DISCONNECTED:
        return 'Disconnected';
      case ConnectionState.ERROR:
        return 'Connection error';
      default:
        return 'Unknown';
    }
  };

  const shouldShowRetry = onRetry && (
    connectionState === ConnectionState.DISCONNECTED || 
    connectionState === ConnectionState.ERROR
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        {showDetails && (
          <span className="text-xs font-medium">
            {getStatusText()}
          </span>
        )}
      </div>
      
      {shouldShowRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <ArrowPathIcon className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
import React from 'react';
import { MessageStatus } from '@/types/messageStatus';
import { 
  ClockIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';

interface EnhancedMessageStatusProps {
  status: MessageStatus;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export default function EnhancedMessageStatus({ 
  status, 
  error, 
  onRetry,
  className = ''
}: EnhancedMessageStatusProps) {
  const renderStatusIcon = () => {
    switch (status) {
      case MessageStatus.QUEUED:
        return (
          <div className="flex items-center gap-1" title="Message queued (offline)">
            <ClockIcon className="h-3 w-3 opacity-50" />
            <span className="text-xs opacity-50">Queued</span>
          </div>
        );
      
      case MessageStatus.SENDING:
        return (
          <div className="flex items-center gap-1" title="Sending message...">
            <ArrowPathIcon className="h-3 w-3 animate-spin opacity-60" />
          </div>
        );
      
      case MessageStatus.SENT:
        return (
          <div title="Message sent">
            <CheckIcon className="h-3 w-3 opacity-70" />
          </div>
        );
      
      case MessageStatus.DELIVERED:
        return (
          <div className="flex -space-x-1" title="Message delivered">
            <CheckIcon className="h-3 w-3 opacity-70" />
            <CheckIcon className="h-3 w-3 opacity-70" />
          </div>
        );
      
      case MessageStatus.READ:
        return (
          <div className="flex -space-x-1" title="Message read">
            <CheckIconSolid className="h-3 w-3 text-blue-500" />
            <CheckIconSolid className="h-3 w-3 text-blue-500" />
          </div>
        );
      
      case MessageStatus.FAILED:
        return (
          <div className="flex items-center gap-1" title={error || "Failed to send"}>
            <ExclamationTriangleIcon className="h-3 w-3 text-red-500" />
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs text-red-500 hover:text-red-600 underline"
              >
                Retry
              </button>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      {renderStatusIcon()}
    </div>
  );
}
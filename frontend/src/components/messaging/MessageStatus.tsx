import { CheckIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  className?: string;
}

export default function MessageStatus({ status, className = '' }: MessageStatusProps) {
  switch (status) {
    case 'sending':
      return (
        <div className={`inline-flex items-center ${className}`}>
          <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    
    case 'sent':
      return (
        <div className={`inline-flex items-center ${className}`}>
          <CheckIcon className="w-4 h-4 text-gray-400" />
        </div>
      );
    
    case 'delivered':
      return (
        <div className={`inline-flex items-center ${className}`}>
          <CheckIcon className="w-4 h-4 text-gray-400" />
          <CheckIcon className="w-4 h-4 text-gray-400 -ml-2" />
        </div>
      );
    
    case 'read':
      return (
        <div className={`inline-flex items-center ${className}`}>
          <CheckIconSolid className="w-4 h-4 text-blue-500" />
          <CheckIconSolid className="w-4 h-4 text-blue-500 -ml-2" />
        </div>
      );
    
    default:
      return null;
  }
}
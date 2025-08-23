'use client';

import { ShieldCheckIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { Tooltip } from '@/components/ui/tooltip';

interface VerificationBadgeProps {
  level: 'none' | 'basic' | 'standard' | 'premium';
  trustScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function VerificationBadge({
  level,
  trustScore,
  size = 'md',
  showLabel = false,
  className = ''
}: VerificationBadgeProps) {
  const badges = {
    premium: {
      icon: ShieldCheckIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Fully Verified',
      tooltip: 'Identity, phone, and email verified'
    },
    standard: {
      icon: CheckBadgeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      label: 'Phone Verified',
      tooltip: 'Phone and email verified'
    },
    basic: {
      icon: CheckBadgeIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: 'Email Verified',
      tooltip: 'Email verified'
    },
    none: {
      icon: null,
      color: '',
      bgColor: '',
      label: '',
      tooltip: ''
    }
  };

  const badge = badges[level];
  
  if (!badge.icon) {
    return null;
  }

  const Icon = badge.icon;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const BadgeContent = () => (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className={`${sizeClasses[size]} ${badge.color}`} />
      {showLabel && (
        <span className={`text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
      )}
    </div>
  );

  if (badge.tooltip) {
    return (
      <Tooltip content={badge.tooltip}>
        <BadgeContent />
      </Tooltip>
    );
  }

  return <BadgeContent />;
}

export function TrustScoreBadge({ 
  score, 
  size = 'md' 
}: { 
  score: number; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${getColor(score)} ${sizeClasses[size]}`}>
      {score}% Trust
    </span>
  );
}
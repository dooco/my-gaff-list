'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  UserIcon, 
  HeartIcon, 
  DocumentTextIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from '@/components/auth/AuthModal';

interface UserMenuProps {
  className?: string;
}

export default function UserMenu({ className = '' }: UserMenuProps) {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const handleShowAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const getUserTypeDisplay = (userType: string) => {
    switch (userType) {
      case 'renter': return 'Renter';
      case 'landlord': return 'Landlord';
      case 'agent': return 'Estate Agent';
      case 'admin': return 'Administrator';
      default: return userType;
    }
  };

  const getUserInitials = (user: any) => {
    if (!user?.first_name || !user?.last_name) return '?';
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Authenticated user menu
  if (isAuthenticated && user) {
    return (
      <div className={`relative ${className}`} ref={menuRef}>
        {/* User Avatar Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
            {user.profile?.avatar ? (
              <img 
                src={user.profile.avatar} 
                alt={user.full_name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              getUserInitials(user)
            )}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium text-gray-900 flex items-center">
              {user.full_name || user.email}
              {user.is_email_verified && (
                <CheckBadgeIcon className="h-4 w-4 text-green-500 ml-1" />
              )}
            </div>
            <div className="text-xs text-gray-500">{getUserTypeDisplay(user.user_type)}</div>
          </div>
          <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-900">{user.full_name || user.username}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
              <div className="text-xs text-gray-400 mt-1">
                {getUserTypeDisplay(user.user_type)}
                {user.is_email_verified && (
                  <span className="ml-2 text-green-600">✓ Verified</span>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <Link
                href={user.user_type === 'landlord' ? "/landlord/dashboard" : "/dashboard"}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <UserIcon className="h-4 w-4 mr-3" />
                Dashboard
              </Link>

              <Link
                href="/saved"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <HeartIcon className="h-4 w-4 mr-3" />
                Saved Properties
              </Link>

              <Link
                href="/messages"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-3" />
                Messages
              </Link>

              {/* Landlord/Agent specific menu items */}
              {(user.user_type === 'landlord' || user.user_type === 'agent') && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link
                    href="/landlord/properties"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserIcon className="h-4 w-4 mr-3" />
                    Manage Properties
                  </Link>
                </>
              )}

              <div className="border-t border-gray-200 my-2"></div>

              <Link
                href="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <Cog6ToothIcon className="h-4 w-4 mr-3" />
                Account Settings
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Guest user buttons
  return (
    <>
      <div className={`flex items-center space-x-3 ${className}`}>
        <button
          onClick={() => handleShowAuth('login')}
          className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={() => handleShowAuth('register')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Sign Up
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  );
}
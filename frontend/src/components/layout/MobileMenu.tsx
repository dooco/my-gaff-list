'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { 
  HomeIcon,
  UserIcon,
  HeartIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: Array<{
    name: string;
    href: string;
    icon: any;
  }>;
  currentPath: string;
}

export default function MobileMenu({ isOpen, onClose, navigation, currentPath }: MobileMenuProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const isActive = (href: string) => {
    if (href === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        aria-hidden="true"
      />

      {/* Menu panel */}
      <div
        ref={menuRef}
        id="mobile-menu"
        className={`
          fixed top-16 right-0 bottom-0 w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-out md:hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        aria-label="Mobile navigation menu"
      >
        <nav className="h-full overflow-y-auto">
          {/* User info section */}
          {isAuthenticated && user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {user.first_name && user.last_name 
                    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
                    : '?'
                  }
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {user.full_name || user.username}
                  </div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Main navigation */}
          <div className="py-4">
            <div className="px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User menu items */}
          {isAuthenticated && user ? (
            <>
              <div className="border-t border-gray-200 py-4">
                <div className="px-2 space-y-1">
                  <Link
                    href={user.user_type === 'landlord' ? "/landlord/dashboard" : "/dashboard"}
                    onClick={onClose}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href="/saved"
                    onClick={onClose}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <HeartIcon className="h-5 w-5" />
                    <span>Saved Properties</span>
                  </Link>

                  <Link
                    href="/enquiries"
                    onClick={onClose}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    <span>My Enquiries</span>
                  </Link>

                  {(user.user_type === 'landlord' || user.user_type === 'agent') && (
                    <>
                      <Link
                        href="/landlord/properties"
                        onClick={onClose}
                        className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        <BuildingOfficeIcon className="h-5 w-5" />
                        <span>Manage Properties</span>
                      </Link>
                      <Link
                        href="/landlord/enquiries"
                        onClick={onClose}
                        className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                        <span>Property Enquiries</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 py-4">
                <div className="px-2 space-y-1">
                  <Link
                    href="/profile"
                    onClick={onClose}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Cog6ToothIcon className="h-5 w-5" />
                    <span>Account Settings</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="border-t border-gray-200 py-4">
              <div className="px-2 space-y-1">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/register"
                  onClick={onClose}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  <UserPlusIcon className="h-5 w-5" />
                  <span>Sign Up</span>
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}

// Add missing import
const BuildingOfficeIcon = require('@heroicons/react/24/outline').BuildingOfficeIcon;
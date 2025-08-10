'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from './UserMenu';
import { 
  ArrowRightOnRectangleIcon,
  UserPlusIcon
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
  const { isAuthenticated, user } = useAuth();
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
          {/* User menu section - using the same component as desktop */}
          {isAuthenticated && user && (
            <div className="p-4 border-b border-gray-200">
              <UserMenu className="w-full" />
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

          {/* Sign in/Sign up for non-authenticated users */}
          {!isAuthenticated ? (
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
          ) : null}
        </nav>
      </div>
    </>
  );
}
'use client';

import { useAuth } from '@/hooks/useAuth';
import { tokenStorage } from '@/utils/tokenStorage';

export default function DebugAuth() {
  const { user, tokens, isAuthenticated } = useAuth();
  
  const handleClearTokens = () => {
    tokenStorage.clearAll();
    window.location.reload();
  };
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
        <p>User: {user?.email || 'None'}</p>
        <p>User Type: {user?.user_type || 'None'}</p>
        <p>Token: {tokens?.access ? tokens.access.substring(0, 20) + '...' : 'None'}</p>
      </div>
      <button
        onClick={handleClearTokens}
        className="mt-2 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
      >
        Clear Tokens & Reload
      </button>
    </div>
  );
}
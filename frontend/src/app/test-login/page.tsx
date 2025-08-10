'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function TestLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testUsers = [
    { email: 'test1@example.com', password: 'testpass123', name: 'Test User 1' },
    { email: 'test2@example.com', password: 'testpass123', name: 'Test User 2' },
  ];

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    
    try {
      await login({ email, password });
      // Redirect to test chat after successful login
      router.push('/test-chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Test WebSocket Chat</h1>
        <p className="text-gray-600 text-center mb-6">
          Login with one of the test accounts
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">Test Accounts:</h3>
            <div className="space-y-3">
              {testUsers.map((user) => (
                <div key={user.email} className="border-t pt-3 first:border-0 first:pt-0">
                  <div className="text-sm text-gray-600 mb-2">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div>Email: {user.email}</div>
                    <div>Password: {user.password}</div>
                  </div>
                  <button
                    onClick={() => handleLogin(user.email, user.password)}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors text-sm"
                  >
                    {loading ? 'Logging in...' : `Login as ${user.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Testing Instructions:</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Open two browser windows (or use incognito mode)</li>
              <li>Login as Test User 1 in the first window</li>
              <li>Login as Test User 2 in the second window</li>
              <li>Both users will join the same conversation automatically</li>
              <li>Send messages and see them appear in real-time!</li>
            </ol>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Conversation ID: 139cddcd-ab35-401c-bb30-a78896a32314
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { authFetch } from '@/utils/authFetch';
import EnhancedChatInterface from '@/components/messaging/EnhancedChatInterface';
import { Conversation } from '@/types/message';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function MessageThread() {
  const params = useParams();
  const router = useRouter();
  const { user, tokens, isLoading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const conversationId = params.id as string;

  useEffect(() => {
    const fetchConversation = async () => {
      if (!tokens?.access || authLoading) {
        return;
      }

      try {
        const response = await authFetch(
          `${BASE_URL}/api/messaging/conversations/${conversationId}/`,
          {
            headers: {
              'Authorization': `Bearer ${tokens.access}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch conversation');
        }

        const data = await response.json();
        setConversation(data);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('Failed to load conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId, tokens?.access, authLoading]);

  const handleBack = () => {
    router.push('/messages');
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading conversation...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.push('/messages')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Back to Messages
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!conversation) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">Conversation not found</p>
            <button
              onClick={() => router.push('/messages')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Back to Messages
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <EnhancedChatInterface 
        conversation={conversation} 
        onBack={handleBack}
      />
    </ProtectedRoute>
  );
}
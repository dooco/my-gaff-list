'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/Modal';
import EnhancedChatInterface from './EnhancedChatInterface';
import { Conversation } from '@/types/message';
import { authFetch } from '@/utils/authFetch';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  initialConversation?: Conversation;
}

export default function MessageModal({ 
  isOpen, 
  onClose, 
  conversationId,
  initialConversation 
}: MessageModalProps) {
  const { tokens, isLoading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchConversation = async () => {
      if (!tokens?.access || authLoading) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Always fetch the full conversation detail including messages
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
        
        // The detail endpoint returns messages, ensure they're in the right order (oldest first)
        if (data.messages && Array.isArray(data.messages)) {
          data.messages = data.messages.reverse();
        }
        
        setConversation(data);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('Failed to load conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId, tokens?.access, authLoading, isOpen]);

  const handleOpenInNewPage = () => {
    window.open(`/messages/${conversationId}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[90vw] h-[90vh] max-w-6xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {conversation?.other_participant?.full_name || conversation?.other_participant?.email || 'Messages'}
            </h2>
            {conversation?.property && (
              <span className="text-sm text-gray-600">
                • {conversation.property.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInNewPage}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Open in new tab"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading conversation...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Close
                </button>
              </div>
            </div>
          ) : conversation ? (
            <div className="h-full">
              <EnhancedChatInterface 
                conversation={conversation} 
                modalMode={true}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600">Conversation not found</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
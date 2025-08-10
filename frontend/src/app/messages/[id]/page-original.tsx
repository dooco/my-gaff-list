'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { authFetch } from '@/utils/authFetch';
import {
  ArrowLeftIcon,
  UserIcon,
  BuildingOfficeIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { useRealtimeMessages, useTypingIndicator } from '@/hooks/useRealtime';
import UserAvatar from '@/components/messaging/UserAvatar';
import RoleBadge from '@/components/messaging/RoleBadge';
import MessageStatus from '@/components/messaging/MessageStatus';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
}

interface Property {
  id: string;
  title: string;
  address: string;
}

interface Message {
  id: string;
  conversation: string;
  sender: User;
  content: string;
  created_at: string;
  edited_at: string | null;
  is_edited: boolean;
  is_read: boolean;
  read_at: string | null;
  is_system_message: boolean;
}

interface Conversation {
  id: string;
  property: Property | null;
  participant1: User;
  participant2: User;
  created_at: string;
  updated_at: string;
  last_message: string;
  last_message_at: string;
  last_message_by: User;
  unread_count: number;
  other_participant: User;
  is_archived: boolean;
  messages: Message[];
}

export default function MessageThread() {
  const params = useParams();
  const router = useRouter();
  const { user, tokens, isLoading: authLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const conversationId = params.id as string;

  // Only enable real-time updates after authentication is confirmed
  const enableRealtime = !authLoading && !!tokens?.access;

  // Real-time updates
  const { newMessages, isConnected } = useRealtimeMessages(enableRealtime ? conversationId : null);
  const { typingUsers, sendTyping } = useTypingIndicator(enableRealtime ? conversationId : null);
  const typingTimeout = useRef<NodeJS.Timeout>();

  // Re-initialize WebSocket when auth changes
  useEffect(() => {
    if (tokens?.access && conversationId) {
      // Token is available, WebSocket hooks will handle connection
      console.log('Auth token available, WebSocket can connect');
    }
  }, [tokens?.access, conversationId]);

  useEffect(() => {
    const fetchConversation = async () => {
      if (!tokens?.access) return;

      try {
        setLoading(true);
        setError(null);

        const response = await authFetch(
          `${BASE_URL}/api/messaging/conversations/${conversationId}/`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch conversation');
        }

        const data = await response.json();
        setConversation(data);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && tokens?.access) {
      fetchConversation();
    } else if (!authLoading && !tokens?.access) {
      setLoading(false);
      setError('Please log in to view messages');
    }
  }, [authLoading, tokens?.access, conversationId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [conversation?.messages]);

  // Merge real-time messages with existing conversation
  useEffect(() => {
    if (newMessages.length > 0 && conversation) {
      setConversation(prev => {
        if (!prev) return prev;
        
        // Merge new messages, avoiding duplicates
        const existingIds = new Set(prev.messages.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
        
        if (uniqueNewMessages.length > 0) {
          return {
            ...prev,
            messages: [...prev.messages, ...uniqueNewMessages],
            last_message: uniqueNewMessages[uniqueNewMessages.length - 1].content,
            last_message_at: uniqueNewMessages[uniqueNewMessages.length - 1].created_at,
          };
        }
        
        return prev;
      });
    }
  }, [newMessages, conversation]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (conversation && conversation.messages.length > 0 && isConnected) {
      const unreadMessages = conversation.messages.filter(
        m => !m.is_read && m.sender.id !== user?.id
      );
      
      if (unreadMessages.length > 0) {
        import('@/services/websocket').then(module => {
          module.webSocketService.markMessagesRead(
            conversationId,
            unreadMessages.map(m => m.id)
          );
        });
      }
    }
  }, [conversation?.messages, isConnected, conversationId, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    console.log('Sending message, isConnected:', isConnected);
    
    setSending(true);
    try {
      // Send via WebSocket if connected, otherwise fallback to HTTP
      if (isConnected) {
        console.log('Using WebSocket to send message');
        const { webSocketService } = await import('@/services/websocket');
        webSocketService.sendMessage(conversationId, newMessage.trim());
        
        // Optimistically add the message to the UI
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          conversation: conversationId,
          sender: user!,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
          edited_at: null,
          is_edited: false,
          is_read: false,
          read_at: null,
          is_system_message: false,
        };
        
        if (conversation) {
          setConversation({
            ...conversation,
            messages: [...conversation.messages, optimisticMessage],
            last_message: optimisticMessage.content,
            last_message_at: optimisticMessage.created_at,
            last_message_by: optimisticMessage.sender
          });
        }
      } else {
        // Fallback to HTTP
        const response = await authFetch(
          `${BASE_URL}/api/messaging/conversations/${conversationId}/send_message/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: newMessage.trim()
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const messageData = await response.json();
        
        // Add the new message to the conversation
        if (conversation) {
          setConversation({
            ...conversation,
            messages: [...conversation.messages, messageData],
            last_message: messageData.content,
            last_message_at: messageData.created_at,
            last_message_by: messageData.sender
          });
        }
      }
      
      setNewMessage('');
      // Stop typing indicator
      sendTyping(false);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (e.target.value.trim()) {
      sendTyping(true);
      
      // Clear existing timeout
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeout.current = setTimeout(() => {
        sendTyping(false);
      }, 2000);
    } else {
      sendTyping(false);
    }
  };

  const handleArchive = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/messaging/conversations/${conversationId}/archive/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens?.access}`,
          },
        }
      );

      if (response.ok) {
        router.push('/messages');
      }
    } catch (err) {
      console.error('Error archiving conversation:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IE', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const formatMessageDate = (dateString: string, previousMessageDate?: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if we should show a date separator
    if (previousMessageDate) {
      const prevDate = new Date(previousMessageDate);
      if (date.toDateString() === prevDate.toDateString()) {
        return null; // Same day, don't show separator
      }
    }

    // Format the date separator
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getParticipantName = (participant: User) => {
    if (participant.first_name || participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`.trim();
    }
    return participant.email;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading conversation...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !conversation) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading conversation</h3>
            <p className="text-gray-600 mb-4">{error || 'Conversation not found'}</p>
            <button
              onClick={() => router.push('/messages')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to messages
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/messages')}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      {getParticipantName(conversation.other_participant)}
                      {isConnected && (
                        <span className="text-xs text-green-600 flex items-center">
                          <WifiIcon className="h-3 w-3 mr-1" />
                          Live
                        </span>
                      )}
                    </h2>
                    {typingUsers.size > 0 && (
                      <p className="text-sm text-gray-500 italic">
                        {conversation.other_participant.first_name || 'User'} is typing...
                      </p>
                    )}
                    {conversation.property && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                        {conversation.property.title}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={handleArchive}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                      Archive conversation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Property Context Card - Show if conversation is about a property */}
            {conversation.property && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Enquiry about: {conversation.property.title}
                    </h3>
                    <p className="text-sm text-gray-600">{conversation.property.address}</p>
                  </div>
                  <button
                    onClick={() => window.location.href = `/property/${conversation.property!.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Property →
                  </button>
                </div>
              </div>
            )}
            {conversation.messages.map((message, index) => {
              const previousMessage = index > 0 ? conversation.messages[index - 1] : null;
              const dateSeparator = formatMessageDate(
                message.created_at,
                previousMessage?.created_at
              );
              const isOwnMessage = message.sender.id === user?.id;

              return (
                <div key={message.id}>
                  {dateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {dateSeparator}
                      </div>
                    </div>
                  )}
                  <div
                    className={`flex mb-4 ${
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className="max-w-[70%]">
                      {/* Show "Initial Enquiry" badge for first message if it's about a property */}
                      {index === 0 && conversation.property && (
                        <div className={`text-xs font-medium mb-1 ${
                          isOwnMessage ? 'text-right text-blue-600' : 'text-left text-gray-600'
                        }`}>
                          Initial Property Enquiry
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <div
                          className={`text-xs mt-1 flex items-center justify-between ${
                            isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                          }`}
                        >
                          <span>
                            {formatDate(message.created_at)}
                            {message.is_edited && ' (edited)'}
                          </span>
                          {isOwnMessage && (
                            <MessageStatus
                              status={message.is_read ? 'read' : 'sent'}
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <textarea
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded-lg transition-colors"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { authFetch } from '@/utils/authFetch';
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  BuildingOfficeIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  InboxIcon,
  CheckIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import UserAvatar from '@/components/messaging/UserAvatar';
import RoleBadge from '@/components/messaging/RoleBadge';
import ConversationFilters from '@/components/messaging/ConversationFilters';
import { ConversationListSkeleton } from '@/components/messaging/ConversationSkeleton';
import { useRealtimeConversations, useBrowserNotifications } from '@/hooks/useRealtime';

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
}

export default function Messages() {
  const router = useRouter();
  const { user, tokens, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'landlords' | 'tenants'>('all');
  
  // Only enable real-time updates after authentication is confirmed
  const enableRealtime = !authLoading && !!tokens?.access;
  
  // Real-time updates
  const { updatedConversations, isConnected } = useRealtimeConversations();
  const { permission, requestPermission, showNotification } = useBrowserNotifications();

  useEffect(() => {
    const fetchConversations = async () => {
      if (!tokens?.access) return;

      try {
        setLoading(true);
        setError(null);

        const response = await authFetch(
          `${BASE_URL}/api/messaging/conversations/?archived=${showArchived}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
        setConversations(data.results || data);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && tokens?.access) {
      fetchConversations();
    } else if (!authLoading && !tokens?.access) {
      setLoading(false);
      setError('Please log in to view messages');
    }
  }, [authLoading, tokens?.access, showArchived]);

  // Merge real-time updates with existing conversations
  const mergedConversations = useMemo(() => {
    const conversationMap = new Map<string, Conversation>();
    
    // Add existing conversations
    conversations.forEach(conv => conversationMap.set(conv.id, conv));
    
    // Merge with real-time updates
    updatedConversations.forEach((updatedConv, id) => {
      const existing = conversationMap.get(id);
      if (existing) {
        // Check if this is a new message notification
        if (updatedConv.last_message_at > existing.last_message_at && 
            updatedConv.last_message_by?.id !== user?.id) {
          // Show browser notification
          if (permission === 'granted') {
            const otherUser = updatedConv.other_participant;
            const userName = otherUser.first_name || otherUser.email;
            showNotification(`New message from ${userName}`, {
              body: updatedConv.last_message,
              tag: `message-${id}`,
              data: { conversationId: id }
            });
          }
        }
        // Merge the updated conversation
        conversationMap.set(id, { ...existing, ...updatedConv });
      } else if (!showArchived && !updatedConv.is_archived) {
        // New conversation
        conversationMap.set(id, updatedConv);
      }
    });
    
    // Sort by last message time
    return Array.from(conversationMap.values()).sort((a, b) => {
      const dateA = new Date(a.last_message_at || a.created_at).getTime();
      const dateB = new Date(b.last_message_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [conversations, updatedConversations, showArchived, permission, showNotification, user?.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getParticipantName = (participant: User) => {
    if (participant.first_name || participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`.trim();
    }
    return participant.email;
  };

  const filteredConversations = mergedConversations.filter(conv => {
    const searchLower = searchTerm.toLowerCase();
    const otherName = getParticipantName(conv.other_participant).toLowerCase();
    const propertyTitle = conv.property?.title?.toLowerCase() || '';
    const lastMessage = conv.last_message?.toLowerCase() || '';

    // Search filter
    const matchesSearch = otherName.includes(searchLower) ||
      propertyTitle.includes(searchLower) ||
      lastMessage.includes(searchLower);

    // Type filter
    let matchesFilter = true;
    switch (filter) {
      case 'unread':
        matchesFilter = conv.unread_count > 0;
        break;
      case 'landlords':
        matchesFilter = conv.other_participant.user_type === 'landlord' || conv.other_participant.user_type === 'agent';
        break;
      case 'tenants':
        matchesFilter = conv.other_participant.user_type === 'renter' || conv.other_participant.user_type === 'tenant';
        break;
    }

    return matchesSearch && matchesFilter;
  });

  const unreadCount = mergedConversations.filter(c => c.unread_count > 0).length;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-500 mr-2" />
                    Messages
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Your conversations with landlords and tenants
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <ConversationListSkeleton />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-500 mr-2" />
                  Messages
                  {isConnected && (
                    <span className="ml-2 inline-flex items-center text-xs text-green-600">
                      <WifiIcon className="h-3 w-3 mr-1" />
                      Live
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 mt-1">
                  Your conversations with landlords and tenants
                </p>
              </div>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showArchived
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {showArchived ? (
                  <>
                    <InboxIcon className="h-4 w-4 mr-2" />
                    Show Inbox
                  </>
                ) : (
                  <>
                    <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                    Show Archived
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Notification Permission Prompt */}
          {permission === 'default' && !loading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-blue-900 font-medium">Enable notifications</p>
                <p className="text-blue-700 text-sm">Get notified when you receive new messages</p>
              </div>
              <button
                onClick={requestPermission}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Enable
              </button>
            </div>
          )}

          {/* Filters */}
          <ConversationFilters
            activeFilter={filter}
            onFilterChange={setFilter}
            unreadCount={unreadCount}
          />

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Conversations List */}
          {filteredConversations.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => router.push(`/messages/${conversation.id}`)}
                  className="p-4 sm:p-6 hover:bg-gray-50 cursor-pointer transition-all hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Participant Info */}
                      <div className="flex items-center mb-2">
                        <div className="mr-3">
                          <UserAvatar user={conversation.other_participant} size="md" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold text-gray-900 truncate ${conversation.unread_count > 0 ? 'font-bold' : ''}`}>
                              {getParticipantName(conversation.other_participant)}
                            </h3>
                            <RoleBadge userType={conversation.other_participant.user_type} size="sm" />
                          </div>
                          {conversation.property && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <BuildingOfficeIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{conversation.property.title}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          {conversation.last_message_at && (
                            <p className={`text-sm ${conversation.unread_count > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                              {formatDate(conversation.last_message_at)}
                            </p>
                          )}
                          {conversation.unread_count > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full mt-1">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Last Message Preview */}
                      <div className="ml-13">
                        <p className={`text-sm line-clamp-2 ${conversation.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          {conversation.last_message_by?.id === user?.id && (
                            <span className="font-normal text-gray-500">You: </span>
                          )}
                          {conversation.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm
                  ? 'No conversations found'
                  : showArchived
                  ? 'No archived conversations'
                  : 'No messages yet'}
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? 'Try a different search term'
                  : showArchived
                  ? 'Archived conversations will appear here'
                  : 'Start a conversation by contacting a landlord about a property'}
              </p>
              {!searchTerm && !showArchived && (
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Browse Properties
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
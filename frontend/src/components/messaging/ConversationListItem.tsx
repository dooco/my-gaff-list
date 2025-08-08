'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Conversation } from '@/types/message';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedWebSocketService } from '@/services/websocketEnhanced';
import { 
  UserIcon, 
  BuildingOfficeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';

interface ConversationListItemProps {
  conversation: Conversation;
  isActive?: boolean;
}

export default function ConversationListItem({ 
  conversation, 
  isActive = false 
}: ConversationListItemProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(conversation.unread_count || 0);
  const [lastMessage, setLastMessage] = useState(conversation.last_message);
  const [lastMessageAt, setLastMessageAt] = useState(conversation.last_message_at);
  const [isTyping, setIsTyping] = useState(false);

  const otherParticipant = conversation.other_participant;
  const isOwnMessage = conversation.last_message_by?.id === user?.id;

  useEffect(() => {
    // Listen for new messages in this conversation
    const handleWebSocketMessage = (data: any) => {
      if (data.type === 'new_message_notification' && 
          data.conversation_id === conversation.id) {
        // Update last message
        setLastMessage(data.message.content);
        setLastMessageAt(data.message.created_at);
        
        // Increment unread count if not currently viewing
        if (!isActive) {
          setUnreadCount(prev => prev + 1);
        }
      }
      
      // Handle typing indicator
      if (data.type === 'typing_indicator' && 
          data.conversation_id === conversation.id &&
          data.user_id !== user?.id) {
        setIsTyping(data.is_typing);
      }
      
      // Handle read receipts
      if (data.type === 'messages_read' && 
          data.conversation_id === conversation.id &&
          data.user_id === user?.id) {
        setUnreadCount(0);
      }
    };

    enhancedWebSocketService.addMessageHandler(handleWebSocketMessage);

    return () => {
      enhancedWebSocketService.removeMessageHandler(handleWebSocketMessage);
    };
  }, [conversation.id, user?.id, isActive]);

  const handleClick = () => {
    router.push(`/messages/${conversation.id}`);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { addSuffix: false });
  };

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center gap-3 p-4 cursor-pointer transition-colors
        ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
        ${unreadCount > 0 ? 'bg-blue-50/50' : ''}
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
          {otherParticipant.first_name?.[0] || otherParticipant.email[0].toUpperCase()}
        </div>
        {otherParticipant.user_type === 'landlord' && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <BuildingOfficeIcon className="h-3 w-3 text-white" />
          </div>
        )}
        {otherParticipant.user_type === 'renter' && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <UserIcon className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {otherParticipant.full_name || otherParticipant.email}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {lastMessageAt && formatTime(lastMessageAt)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {isOwnMessage && (
              <div className="flex-shrink-0">
                {conversation.messages?.some(m => m.sender.id === user?.id && m.is_read) ? (
                  <div className="flex -space-x-1">
                    <CheckIconSolid className="h-4 w-4 text-blue-500" />
                    <CheckIconSolid className="h-4 w-4 text-blue-500" />
                  </div>
                ) : (
                  <CheckIcon className="h-4 w-4 text-gray-400" />
                )}
              </div>
            )}
            
            <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              {isTyping ? (
                <span className="text-green-600 italic">typing...</span>
              ) : (
                lastMessage || 'Start a conversation'
              )}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <div className="flex-shrink-0 ml-2">
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </div>
          )}
        </div>
        
        {conversation.property && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            📍 {conversation.property.title}
          </p>
        )}
      </div>
    </div>
  );
}
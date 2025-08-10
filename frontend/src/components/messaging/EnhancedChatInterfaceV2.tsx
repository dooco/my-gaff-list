'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEnhancedWebSocketMessages } from '@/hooks/useEnhancedWebSocketMessages';
import { ConnectionState } from '@/services/websocket';
import VirtualMessageList from './VirtualMessageList';
import EnhancedConnectionStatus from './EnhancedConnectionStatus';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon,
  PhotoIcon,
  FaceSmileIcon,
  EllipsisHorizontalIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface EnhancedChatInterfaceV2Props {
  conversationId: string;
  recipientName?: string;
  recipientAvatar?: string;
  recipientId?: string;
}

export default function EnhancedChatInterfaceV2({ 
  conversationId, 
  recipientName = 'User',
  recipientAvatar,
  recipientId
}: EnhancedChatInterfaceV2Props) {
  const {
    messages,
    connectionState,
    isConnected,
    typingUsers,
    sendMessage,
    retryMessage,
    markMessagesRead,
    sendTypingIndicator,
    reconnect
  } = useEnhancedWebSocketMessages(conversationId);
  
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mark messages as read when they become visible
  useEffect(() => {
    const unreadMessages = messages
      .filter(m => !m.is_read && m.sender !== recipientId)
      .map(m => m.id);
    
    if (unreadMessages.length > 0) {
      markMessagesRead(unreadMessages);
    }
  }, [messages, recipientId, markMessagesRead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageText(value);

    // Handle typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingIndicator(false);
      }, 2000);
    } else {
      setIsTyping(false);
      sendTypingIndicator(false);
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    // Send the message
    sendMessage(messageText.trim());
    
    // Clear input
    setMessageText('');
    
    // Stop typing indicator
    setIsTyping(false);
    sendTypingIndicator(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Focus back on input
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    // Get the oldest message timestamp
    const oldestMessage = messages[0];
    if (oldestMessage) {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages?before=${oldestMessage.created_at}&limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setHasMore(data.has_more);
          // Messages will be added through WebSocket
        }
      } catch (error) {
        console.error('Failed to load more messages:', error);
      }
    }
    
    setLoadingMore(false);
  };

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${recipientName} is typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  const canSendMessage = messageText.trim() && (
    connectionState === ConnectionState.CONNECTED || 
    connectionState === ConnectionState.RECONNECTING
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300">
            {recipientAvatar ? (
              <img 
                src={recipientAvatar} 
                alt={recipientName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">{recipientName}</h3>
            <div className="text-xs text-gray-500">
              {typingUsers.length > 0 ? (
                <span className="text-green-600 animate-pulse">{getTypingText()}</span>
              ) : (
                <EnhancedConnectionStatus 
                  connectionState={connectionState}
                  onRetry={reconnect}
                  showDetails={true}
                />
              )}
            </div>
          </div>
        </div>

        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Connection Warning Banner */}
      {connectionState === ConnectionState.ERROR && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <ExclamationCircleIcon className="h-4 w-4" />
            <span>Connection error. Messages will be queued and sent when connection is restored.</span>
            <button 
              onClick={reconnect}
              className="ml-auto text-red-600 hover:text-red-700 font-medium underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {connectionState === ConnectionState.RECONNECTING && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-yellow-700">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Reconnecting to chat server...</span>
          </div>
        </div>
      )}

      {/* Messages Area with Virtual Scrolling */}
      <VirtualMessageList
        messages={messages}
        onRetryMessage={retryMessage}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loadingMore}
        recipientName={recipientName}
        recipientAvatar={recipientAvatar}
      />

      {/* Input Area */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaceSmileIcon className="h-5 w-5 text-gray-600" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <PaperClipIcon className="h-5 w-5 text-gray-600" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <PhotoIcon className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                connectionState === ConnectionState.DISCONNECTED 
                  ? "You're offline. Messages will be sent when reconnected..." 
                  : "Type a message..."
              }
              className="w-full px-4 py-2 pr-12 bg-gray-100 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
              rows={1}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
              }}
            />
            
            {/* Character count for long messages */}
            {messageText.length > 4500 && (
              <div className={`absolute bottom-1 right-12 text-xs ${
                messageText.length > 5000 ? 'text-red-500' : 'text-gray-500'
              }`}>
                {messageText.length}/5000
              </div>
            )}
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!canSendMessage || messageText.length > 5000}
            className={`
              p-2 rounded-full transition-all transform
              ${canSendMessage && messageText.length <= 5000
                ? 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Status text */}
        {connectionState === ConnectionState.DISCONNECTED && (
          <div className="mt-2 text-xs text-orange-600 text-center">
            You're offline. Messages will be queued and sent when connection is restored.
          </div>
        )}
        
        {messages.some(m => m.status === 'queued') && (
          <div className="mt-2 text-xs text-blue-600 text-center">
            {messages.filter(m => m.status === 'queued').length} message(s) queued for sending
          </div>
        )}
      </div>
    </div>
  );
}
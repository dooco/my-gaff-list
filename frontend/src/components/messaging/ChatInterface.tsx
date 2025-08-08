'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWebSocketMessages } from '@/hooks/useWebSocketMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { Message } from '@/types/message';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon,
  PhotoIcon,
  FaceSmileIcon,
  CheckIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import ConnectionStatus from './ConnectionStatus';

interface ChatInterfaceProps {
  conversationId: string;
  recipientName?: string;
  recipientAvatar?: string;
}

export default function ChatInterface({ 
  conversationId, 
  recipientName = 'User',
  recipientAvatar 
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const { messages, isConnected, sendMessage, markAsRead } = useWebSocketMessages(conversationId);
  const { typingUsers, sendTyping, getTypingText } = useTypingIndicator(conversationId);
  
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when they become visible
  useEffect(() => {
    const unreadMessages = messages
      .filter(m => !m.is_read && m.sender !== user?.id)
      .map(m => m.id);
    
    if (unreadMessages.length > 0) {
      markAsRead(unreadMessages);
    }
  }, [messages, user, markAsRead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageText(value);

    // Handle typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTyping(false);
      }, 1000);
    } else {
      setIsTyping(false);
      sendTyping(false);
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !isConnected) return;

    // Send the message
    sendMessage(messageText.trim());
    
    // Clear input
    setMessageText('');
    
    // Stop typing indicator
    setIsTyping(false);
    sendTyping(false);
    
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

  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.sender === user?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !previousMessage || previousMessage.sender !== message.sender;
    const messageTime = formatDistanceToNow(new Date(message.created_at), { addSuffix: false });

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}
      >
        <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[70%]`}>
          {!isOwnMessage && showAvatar && (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
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
          )}
          
          {!isOwnMessage && !showAvatar && (
            <div className="w-8 flex-shrink-0" />
          )}

          <div
            className={`
              relative px-4 py-2 rounded-2xl
              ${isOwnMessage 
                ? 'bg-blue-500 text-white rounded-br-sm' 
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }
            `}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            
            <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                {messageTime}
              </span>
              
              {isOwnMessage && (
                <div className="flex">
                  {message.is_read ? (
                    <div className="flex -space-x-1">
                      <CheckIconSolid className="h-3 w-3 text-blue-200" />
                      <CheckIconSolid className="h-3 w-3 text-blue-200" />
                    </div>
                  ) : message.temp_id ? (
                    <CheckIcon className="h-3 w-3 text-blue-200 opacity-50" />
                  ) : (
                    <CheckIcon className="h-3 w-3 text-blue-200" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                <span className="text-green-600">{getTypingText()}</span>
              ) : (
                <ConnectionStatus />
              )}
            </div>
          </div>
        </div>

        <button className="p-2 hover:bg-gray-100 rounded-full">
          <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="min-h-full flex flex-col justify-end">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => renderMessage(message, index))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <FaceSmileIcon className="h-5 w-5 text-gray-600" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <PaperClipIcon className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-2 pr-12 bg-gray-100 rounded-full resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={1}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
              }}
              disabled={!isConnected}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !isConnected}
            className={`
              p-2 rounded-full transition-colors
              ${messageText.trim() && isConnected
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>

        {!isConnected && (
          <div className="mt-2 text-xs text-orange-600 text-center">
            Connecting to chat server...
          </div>
        )}
      </div>
    </div>
  );
}
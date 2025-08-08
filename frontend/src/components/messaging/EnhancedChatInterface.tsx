'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Conversation } from '@/types/message';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { formatDistanceToNow } from 'date-fns';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon,
  PhotoIcon,
  FaceSmileIcon,
  CheckIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
  WifiIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { enhancedWebSocketService } from '@/services/websocketEnhanced';

interface EnhancedChatInterfaceProps {
  conversation: Conversation;
  onBack?: () => void;
}

export default function EnhancedChatInterface({ 
  conversation,
  onBack 
}: EnhancedChatInterfaceProps) {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  
  const [messages, setMessages] = useState<Message[]>(conversation.messages || []);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [sending, setSending] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const otherParticipant = conversation.other_participant;

  // Initialize WebSocket listeners
  useEffect(() => {
    if (!isConnected) {
      setConnectionStatus('connecting');
      return;
    }

    setConnectionStatus('connected');
    
    // Join the conversation
    enhancedWebSocketService.joinConversation(conversation.id);

    // Set up message handler
    const handleWebSocketMessage = (data: any) => {
      console.log('WebSocket message received:', data);
      
      switch(data.type) {
        case 'new_message':
          const newMessage = data.message;
          setMessages(prev => {
            // Check if message already exists (to avoid duplicates)
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
          
          // Mark as read if from other user
          if (newMessage.sender.id !== user?.id && !newMessage.is_read) {
            enhancedWebSocketService.markMessagesRead(conversation.id, [newMessage.id]);
          }
          break;
          
        case 'typing_indicator':
          if (data.user_id !== user?.id) {
            setOtherUserTyping(data.is_typing);
          }
          break;
          
        case 'messages_read':
          if (data.user_id !== user?.id) {
            setMessages(prev => prev.map(msg => {
              if (data.message_ids.includes(msg.id)) {
                return { ...msg, is_read: true, read_at: new Date().toISOString() };
              }
              return msg;
            }));
          }
          break;
          
        case 'connection_established':
          console.log('WebSocket connection established');
          setConnectionStatus('connected');
          break;
          
        case 'error':
          console.error('WebSocket error:', data.message);
          break;
      }
    };

    // Add message handler
    enhancedWebSocketService.addMessageHandler(handleWebSocketMessage);

    // Cleanup
    return () => {
      enhancedWebSocketService.removeMessageHandler(handleWebSocketMessage);
      enhancedWebSocketService.leaveConversation(conversation.id);
    };
  }, [isConnected, conversation.id, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageText(value);

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }

    // Handle typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      enhancedWebSocketService.sendTypingIndicator(conversation.id, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        enhancedWebSocketService.sendTypingIndicator(conversation.id, false);
      }, 2000);
    } else {
      setIsTyping(false);
      enhancedWebSocketService.sendTypingIndicator(conversation.id, false);
    }
  };

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !isConnected || sending) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    
    // Add optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      conversation: conversation.id,
      sender: {
        id: user!.id,
        email: user!.email,
        first_name: user!.first_name || '',
        last_name: user!.last_name || '',
        full_name: user!.full_name || user!.email,
        user_type: user!.user_type,
        username: user!.username || user!.email,
        phone_number: '',
        is_email_verified: false,
        is_phone_verified: false,
        profile_completed: false,
        profile: null,
        created_at: '',
        updated_at: ''
      },
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      edited_at: null,
      is_edited: false,
      is_read: false,
      read_at: null,
      is_system_message: false,
      attachments: []
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Send via WebSocket
    enhancedWebSocketService.sendMessage(conversation.id, messageText.trim());
    
    // Clear input
    setMessageText('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    // Stop typing indicator
    setIsTyping(false);
    enhancedWebSocketService.sendTypingIndicator(conversation.id, false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSending(false);
    
    // Focus back on input
    inputRef.current?.focus();
  }, [messageText, isConnected, sending, conversation.id, user]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render message
  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.sender.id === user?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !previousMessage || previousMessage.sender.id !== message.sender.id;
    const messageTime = formatDistanceToNow(new Date(message.created_at), { addSuffix: false });

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}
      >
        <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[70%]`}>
          {!isOwnMessage && showAvatar && (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                {otherParticipant.first_name?.[0] || otherParticipant.email[0].toUpperCase()}
              </div>
            </div>
          )}
          
          {!isOwnMessage && !showAvatar && (
            <div className="w-8 flex-shrink-0" />
          )}

          <div
            className={`
              relative px-4 py-2 rounded-2xl shadow-sm
              ${isOwnMessage 
                ? 'bg-blue-500 text-white rounded-br-sm' 
                : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
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
                  ) : message.id.startsWith('temp-') ? (
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

  // Get connection status color
  const getStatusColor = () => {
    switch(connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Fixed at top */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
          
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
            {otherParticipant.first_name?.[0] || otherParticipant.email[0].toUpperCase()}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">
              {otherParticipant.full_name || otherParticipant.email}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {otherUserTyping ? (
                <span className="text-green-600 animate-pulse">typing...</span>
              ) : (
                <>
                  <WifiIcon className={`h-3 w-3 ${getStatusColor()}`} />
                  <span className={getStatusColor()}>
                    {connectionStatus === 'connected' ? 'Online' : 
                     connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Messages Area - Scrollable, takes remaining space */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
        
        {otherUserTyping && (
          <div className="flex justify-start mb-2">
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                {otherParticipant.first_name?.[0] || otherParticipant.email[0].toUpperCase()}
              </div>
              <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-bl-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="bg-white border-t shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-end gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors mb-1">
              <PaperClipIcon className="h-5 w-5 text-gray-600" />
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={messageText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                className="w-full px-4 py-2 bg-gray-100 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
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
              disabled={!messageText.trim() || !isConnected || sending}
              className={`
                p-2 rounded-full transition-all mb-1
                ${messageText.trim() && isConnected && !sending
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transform hover:scale-105' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>

          {!isConnected && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-orange-600">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>Connecting to chat server...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
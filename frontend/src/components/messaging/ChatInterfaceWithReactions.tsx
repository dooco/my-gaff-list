'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Conversation } from '@/types/message';
import { useAuth } from '@/contexts/AuthContext';
import { webSocketService } from '@/services/websocket';
import EnhancedMessage from './EnhancedMessage';
import { 
  PaperAirplaneIcon, 
  FaceSmileIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import EmojiPicker from './EmojiPicker';

interface ChatInterfaceWithReactionsProps {
  conversation: Conversation;
  onBack?: () => void;
}

export default function ChatInterfaceWithReactions({ 
  conversation,
  onBack 
}: ChatInterfaceWithReactionsProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>(conversation.messages || []);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const otherParticipant = conversation.other_participant;

  // Initialize WebSocket listeners
  useEffect(() => {
    // Join the conversation
    webSocketService.joinConversation(conversation.id);

    // Set up message handler
    const handleWebSocketMessage = (data: any) => {
      console.log('WebSocket message received:', data);
      
      switch(data.type) {
        case 'new_message':
          const newMessage = data.message;
          const tempId = data.temp_id;
          
          setMessages(prev => {
            // Replace optimistic message if temp_id matches
            if (tempId) {
              const tempIndex = prev.findIndex(m => m.id === tempId);
              if (tempIndex !== -1) {
                const updated = [...prev];
                updated[tempIndex] = newMessage;
                return updated;
              }
            }
            
            // Check for duplicates
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            
            // Only add if from other user
            if (newMessage.sender.id !== user?.id) {
              return [...prev, newMessage];
            }
            
            return prev;
          });
          
          // Mark as read if from other user
          if (newMessage.sender.id !== user?.id && !newMessage.is_read) {
            webSocketService.markMessagesRead(conversation.id, [newMessage.id]);
          }
          break;
          
        case 'typing_indicator':
          if (data.user_id !== user?.id) {
            setOtherUserTyping(data.is_typing);
          }
          break;
          
        case 'reaction_added':
          setMessages(prev => prev.map(msg => {
            if (msg.id === data.message_id) {
              const updatedReactions = msg.reaction_summary || [];
              const existingReaction = updatedReactions.find((r: any) => r.emoji === data.reaction.emoji);
              
              if (existingReaction) {
                existingReaction.count++;
                if (data.reaction.user.id === user?.id) {
                  existingReaction.has_reacted = true;
                }
              } else {
                updatedReactions.push({
                  emoji: data.reaction.emoji,
                  count: 1,
                  users: [data.reaction.user.full_name || data.reaction.user.email],
                  has_reacted: data.reaction.user.id === user?.id
                });
              }
              
              return { ...msg, reaction_summary: updatedReactions };
            }
            return msg;
          }));
          break;
          
        case 'reaction_removed':
          setMessages(prev => prev.map(msg => {
            if (msg.id === data.message_id) {
              const updatedReactions = (msg.reaction_summary || []).map((r: any) => {
                if (r.emoji === data.emoji) {
                  r.count--;
                  if (data.user_id === user?.id) {
                    r.has_reacted = false;
                  }
                }
                return r;
              }).filter((r: any) => r.count > 0);
              
              return { ...msg, reaction_summary: updatedReactions };
            }
            return msg;
          }));
          break;
          
        case 'message_edited':
          setMessages(prev => prev.map(msg => 
            msg.id === data.message.id ? { ...data.message } : msg
          ));
          break;
          
        case 'message_deleted':
          setMessages(prev => prev.map(msg => {
            if (msg.id === data.message_id) {
              return {
                ...msg,
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deletion_type: data.deletion_type
              };
            }
            return msg;
          }));
          break;
      }
    };

    // Connect and set up handler
    webSocketService.connect({
      onMessage: handleWebSocketMessage,
    });

    // Cleanup
    return () => {
      webSocketService.leaveConversation(conversation.id);
    };
  }, [conversation.id, user?.id]);

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

    // Handle typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      webSocketService.sendTypingIndicator(conversation.id, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        webSocketService.sendTypingIndicator(conversation.id, false);
      }, 2000);
    } else {
      setIsTyping(false);
      webSocketService.sendTypingIndicator(conversation.id, false);
    }
  };

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !webSocketService.isConnected()) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    // Add optimistic message
    const optimisticMessage = {
      id: tempId,
      conversation: conversation.id,
      sender: {
        id: user!.id,
        email: user!.email,
        full_name: user!.full_name || user!.email,
      },
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      is_edited: false,
      is_read: false,
      reaction_summary: [],
      can_edit: true,
      can_delete: true
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Send via WebSocket with temp_id
    webSocketService.send({
      type: 'send_message',
      conversation_id: conversation.id,
      content: messageText.trim(),
      temp_id: tempId
    });
    
    // Clear input
    setMessageText('');
    
    // Stop typing indicator
    setIsTyping(false);
    webSocketService.sendTypingIndicator(conversation.id, false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Focus back on input
    inputRef.current?.focus();
  }, [messageText, conversation.id, user]);

  // Handle reactions
  const handleAddReaction = (messageId: string, emoji: string) => {
    webSocketService.send({
      type: 'add_reaction',
      message_id: messageId,
      emoji
    });
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    webSocketService.send({
      type: 'remove_reaction',
      message_id: messageId,
      emoji
    });
  };

  // Handle edit
  const handleEditMessage = (messageId: string, content: string) => {
    webSocketService.send({
      type: 'edit_message',
      message_id: messageId,
      content
    });
  };

  // Handle delete
  const handleDeleteMessage = (messageId: string) => {
    webSocketService.send({
      type: 'delete_message',
      message_id: messageId,
      deletion_type: 'soft'
    });
  };

  // Handle emoji picker
  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Render message
  const renderMessage = (message: any, index: number) => {
    const isOwnMessage = message.sender.id === user?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !previousMessage || previousMessage.sender.id !== message.sender.id;

    return (
      <EnhancedMessage
        key={message.id}
        message={message}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        recipientName={otherParticipant.full_name || otherParticipant.email}
        recipientAvatar={otherParticipant.avatar}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onAddReaction={handleAddReaction}
        onRemoveReaction={handleRemoveReaction}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-full lg:hidden"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
          
          <div className="w-10 h-10 rounded-full bg-gray-300">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
              {otherParticipant.first_name?.[0] || otherParticipant.email[0].toUpperCase()}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">
              {otherParticipant.full_name || otherParticipant.email}
            </h3>
            {otherUserTyping && (
              <p className="text-xs text-green-600 animate-pulse">typing...</p>
            )}
          </div>
        </div>

        <button className="p-2 hover:bg-gray-100 rounded-full">
          <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => renderMessage(message, index))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaceSmileIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
                position="top"
                align="left"
              />
            )}
          </div>

          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={handleInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="w-full px-4 py-2 bg-gray-100 rounded-full resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={1}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !webSocketService.isConnected()}
            className={`
              p-2 rounded-full transition-colors
              ${messageText.trim() && webSocketService.isConnected()
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
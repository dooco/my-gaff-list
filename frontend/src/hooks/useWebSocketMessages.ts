import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { enhancedWebSocketService as webSocketService, WebSocketMessage } from '@/services/websocketEnhanced';
import { Message } from '@/types/message';

export function useWebSocketMessages(conversationId: string | null) {
  const { isConnected, joinConversation, leaveConversation } = useWebSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessages, setNewMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId || !isConnected) {
      return;
    }

    // Avoid rejoining if already in this conversation
    if (joinedRef.current === conversationId) {
      return;
    }

    const handleMessage = (data: WebSocketMessage) => {
      console.log('[useWebSocketMessages] Received:', data);
      
      if (data.type === 'new_message' && data.message) {
        const message = data.message as Message;
        
        // Only add if it's for the current conversation
        if (message.conversation === conversationId) {
          console.log('[useWebSocketMessages] New message for current conversation');
          messagesRef.current.push(message);
          setNewMessages([...messagesRef.current]);
          setMessages(prev => [...prev, message]);
        }
      } else if (data.type === 'message_sent' && data.message) {
        // Handle confirmation of sent message
        const message = data.message as Message;
        if (message.conversation === conversationId) {
          setMessages(prev => {
            // Update the temporary message with the server response
            const tempIndex = prev.findIndex(m => m.id === message.temp_id);
            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = message;
              return updated;
            }
            return [...prev, message];
          });
        }
      } else if (data.type === 'joined_conversation') {
        console.log('[useWebSocketMessages] Joined conversation:', data.conversation_id);
        joinedRef.current = data.conversation_id;
      } else if (data.type === 'left_conversation') {
        console.log('[useWebSocketMessages] Left conversation:', data.conversation_id);
        if (joinedRef.current === data.conversation_id) {
          joinedRef.current = null;
        }
      }
    };

    // Set up message handler
    webSocketService.connect({
      onMessage: handleMessage,
    });

    // Join the conversation
    console.log('[useWebSocketMessages] Joining conversation:', conversationId);
    joinConversation(conversationId);
    joinedRef.current = conversationId;

    return () => {
      if (joinedRef.current === conversationId) {
        console.log('[useWebSocketMessages] Leaving conversation:', conversationId);
        leaveConversation(conversationId);
        joinedRef.current = null;
      }
      messagesRef.current = [];
      setNewMessages([]);
    };
  }, [conversationId, isConnected, joinConversation, leaveConversation]);

  const sendMessage = useCallback((content: string) => {
    if (!conversationId || !isConnected) {
      console.error('[useWebSocketMessages] Cannot send message: not connected');
      return null;
    }

    // Create optimistic message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      temp_id: `temp-${Date.now()}`,
      conversation: conversationId,
      content,
      sender: 'current-user', // This should come from auth context
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_read: false,
    };

    // Add to local state immediately (optimistic update)
    setMessages(prev => [...prev, tempMessage]);

    // Send via WebSocket
    webSocketService.sendMessage(conversationId, content);

    return tempMessage;
  }, [conversationId, isConnected]);

  const clearNewMessages = useCallback(() => {
    messagesRef.current = [];
    setNewMessages([]);
  }, []);

  const markAsRead = useCallback((messageIds: string[]) => {
    if (!isConnected) return;
    
    // Send read receipts via WebSocket
    messageIds.forEach(messageId => {
      webSocketService.send({
        type: 'mark_as_read',
        message_id: messageId,
      });
    });
  }, [isConnected]);

  return {
    messages,
    newMessages,
    isConnected,
    sendMessage,
    clearNewMessages,
    markAsRead,
  };
}
import { useEffect, useState, useCallback, useRef } from 'react';
import { webSocketService, ConnectionState, WebSocketMessage } from '@/services/websocket';
import { Message } from '@/types/message';
import { MessageStatus, MessageWithStatus } from '@/types/messageStatus';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedMessage extends Message {
  status?: MessageStatus;
  error?: string;
}

export function useEnhancedWebSocketMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isTyping, setIsTyping] = useState<Set<string>>(new Set());
  const joinedRef = useRef<string | null>(null);
  const messagesRef = useRef<Map<string, EnhancedMessage>>(new Map());

  // Connect and set up message handlers
  useEffect(() => {
    const handleMessage = (data: WebSocketMessage) => {
      console.log('[Enhanced WebSocket] Received:', data);
      
      switch (data.type) {
        case 'new_message':
          handleNewMessage(data.message as Message);
          break;
        
        case 'message_sent':
          handleMessageSent(data);
          break;
        
        case 'message_delivered':
          handleMessageDelivered(data);
          break;
        
        case 'messages_read':
          handleMessagesRead(data);
          break;
        
        case 'typing_indicator':
          handleTypingIndicator(data);
          break;
        
        case 'joined_conversation':
          joinedRef.current = data.conversation_id;
          break;
        
        case 'left_conversation':
          if (joinedRef.current === data.conversation_id) {
            joinedRef.current = null;
          }
          break;
        
        case 'error':
          handleError(data);
          break;
      }
    };

    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
      
      // When reconnected, re-join conversation and sync messages
      if (state === ConnectionState.CONNECTED && conversationId && joinedRef.current !== conversationId) {
        webSocketService.joinConversation(conversationId);
        syncMessages();
      }
    };

    // Connect with enhanced options
    webSocketService.connect({
      onMessage: handleMessage,
      onConnectionStateChange: handleConnectionStateChange,
      enableOfflineQueue: true,
      maxQueueSize: 50,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10
    });

    return () => {
      if (joinedRef.current) {
        webSocketService.leaveConversation(joinedRef.current);
        joinedRef.current = null;
      }
    };
  }, []);

  // Join/leave conversation
  useEffect(() => {
    if (!conversationId || connectionState !== ConnectionState.CONNECTED) {
      return;
    }

    if (joinedRef.current !== conversationId) {
      // Leave previous conversation
      if (joinedRef.current) {
        webSocketService.leaveConversation(joinedRef.current);
      }
      
      // Join new conversation
      webSocketService.joinConversation(conversationId);
      joinedRef.current = conversationId;
      
      // Clear messages for new conversation
      messagesRef.current.clear();
      setMessages([]);
      
      // Load conversation history
      loadConversationHistory(conversationId);
    }
  }, [conversationId, connectionState]);

  const handleNewMessage = (message: Message) => {
    if (message.conversation !== joinedRef.current) return;
    
    const enhancedMessage: EnhancedMessage = {
      ...message,
      status: message.sender === user?.id ? MessageStatus.DELIVERED : undefined
    };
    
    messagesRef.current.set(message.id, enhancedMessage);
    updateMessages();
  };

  const handleMessageSent = (data: WebSocketMessage) => {
    const message = data.message as Message;
    const tempId = data.temp_id;
    
    // Update temp message with real ID and status
    if (tempId) {
      const tempMessage = Array.from(messagesRef.current.values()).find(m => m.id === tempId);
      if (tempMessage) {
        messagesRef.current.delete(tempId);
        const sentMessage: EnhancedMessage = {
          ...message,
          status: MessageStatus.SENT
        };
        messagesRef.current.set(message.id, sentMessage);
        updateMessages();
      }
    }
  };

  const handleMessageDelivered = (data: WebSocketMessage) => {
    const messageId = data.message_id;
    const message = messagesRef.current.get(messageId);
    
    if (message && message.sender === user?.id) {
      message.status = MessageStatus.DELIVERED;
      updateMessages();
    }
  };

  const handleMessagesRead = (data: WebSocketMessage) => {
    const messageIds = data.message_ids || [];
    const readByUserId = data.user_id;
    
    // Update status for messages read by other user
    if (readByUserId !== user?.id) {
      messageIds.forEach((id: string) => {
        const message = messagesRef.current.get(id);
        if (message && message.sender === user?.id) {
          message.status = MessageStatus.READ;
        }
      });
      updateMessages();
    }
  };

  const handleTypingIndicator = (data: WebSocketMessage) => {
    const userId = data.user_id;
    const isTyping = data.is_typing;
    
    setIsTyping(prev => {
      const newSet = new Set(prev);
      if (isTyping) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
    
    // Auto-clear typing indicator after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        setIsTyping(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 3000);
    }
  };

  const handleError = (data: WebSocketMessage) => {
    if (data.temp_id) {
      // Mark message as failed
      const message = Array.from(messagesRef.current.values()).find(m => m.id === data.temp_id);
      if (message) {
        message.status = MessageStatus.FAILED;
        message.error = data.message || 'Failed to send message';
        updateMessages();
      }
    }
  };

  const updateMessages = () => {
    const sortedMessages = Array.from(messagesRef.current.values())
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setMessages(sortedMessages);
  };

  const sendMessage = useCallback((content: string) => {
    if (!conversationId || !user) {
      console.error('[Enhanced WebSocket] Cannot send message: no conversation or user');
      return null;
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMessage: EnhancedMessage = {
      id: tempId,
      temp_id: tempId,
      conversation: conversationId,
      content,
      sender: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_read: false,
      status: connectionState === ConnectionState.CONNECTED ? MessageStatus.SENDING : MessageStatus.QUEUED
    };

    // Add to local state immediately
    messagesRef.current.set(tempId, tempMessage);
    updateMessages();

    // Send via WebSocket (will queue if offline)
    webSocketService.send({
      type: 'send_message',
      conversation_id: conversationId,
      content,
      temp_id: tempId
    });

    return tempMessage;
  }, [conversationId, user, connectionState]);

  const retryMessage = useCallback((messageId: string) => {
    const message = messagesRef.current.get(messageId);
    if (message && message.status === MessageStatus.FAILED) {
      message.status = MessageStatus.SENDING;
      message.error = undefined;
      updateMessages();
      
      webSocketService.send({
        type: 'send_message',
        conversation_id: message.conversation,
        content: message.content,
        temp_id: message.id
      });
    }
  }, []);

  const markMessagesRead = useCallback((messageIds: string[]) => {
    if (!conversationId || connectionState !== ConnectionState.CONNECTED) return;
    
    webSocketService.markMessagesRead(conversationId, messageIds);
    
    // Update local state
    messageIds.forEach(id => {
      const message = messagesRef.current.get(id);
      if (message) {
        message.is_read = true;
      }
    });
    updateMessages();
  }, [conversationId, connectionState]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!conversationId || connectionState !== ConnectionState.CONNECTED) return;
    
    webSocketService.sendTypingIndicator(conversationId, isTyping);
  }, [conversationId, connectionState]);

  const loadConversationHistory = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const messages = data.results || data;
        
        // Add messages to cache
        messages.forEach((message: Message) => {
          const enhancedMessage: EnhancedMessage = {
            ...message,
            status: message.is_read ? MessageStatus.READ : MessageStatus.DELIVERED
          };
          messagesRef.current.set(message.id, enhancedMessage);
        });
        
        updateMessages();
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const syncMessages = async () => {
    if (!conversationId) return;
    
    // Get the latest message timestamp
    const messages = Array.from(messagesRef.current.values());
    const latestMessage = messages.reduce((latest, msg) => {
      const msgTime = new Date(msg.created_at).getTime();
      const latestTime = latest ? new Date(latest.created_at).getTime() : 0;
      return msgTime > latestTime ? msg : latest;
    }, null as EnhancedMessage | null);
    
    if (latestMessage) {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages?after=${latestMessage.created_at}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const newMessages = data.results || data;
          
          // Add new messages to cache
          newMessages.forEach((message: Message) => {
            if (!messagesRef.current.has(message.id)) {
              const enhancedMessage: EnhancedMessage = {
                ...message,
                status: message.is_read ? MessageStatus.READ : MessageStatus.DELIVERED
              };
              messagesRef.current.set(message.id, enhancedMessage);
            }
          });
          
          updateMessages();
        }
      } catch (error) {
        console.error('Failed to sync messages:', error);
      }
    }
  };

  const reconnect = useCallback(() => {
    webSocketService.reconnect();
  }, []);

  return {
    messages,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    typingUsers: Array.from(isTyping),
    sendMessage,
    retryMessage,
    markMessagesRead,
    sendTypingIndicator,
    reconnect
  };
}
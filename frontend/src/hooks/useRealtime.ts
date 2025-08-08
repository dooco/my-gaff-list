import { useEffect, useState, useCallback, useRef } from 'react';
import { webSocketService, WebSocketMessage } from '@/services/websocket';
import { Message, Conversation } from '@/types/message';
import { tokenStorage } from '@/utils/tokenStorage';

export function useRealtimeMessages(conversationId: string | null) {
  const [newMessages, setNewMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const messagesRef = useRef<Message[]>([]);

  // Check for token availability
  useEffect(() => {
    const checkToken = () => {
      const token = tokenStorage.getAccessToken();
      setHasToken(!!token);
    };

    // Check initially
    checkToken();

    // Listen for storage changes (in case token is set from another tab/component)
    window.addEventListener('storage', checkToken);
    
    // Also check periodically in case localStorage is updated in same tab
    const interval = setInterval(checkToken, 1000);

    return () => {
      window.removeEventListener('storage', checkToken);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!conversationId || !hasToken) {
      if (!hasToken) {
        console.log('No auth token available, skipping WebSocket connection');
      }
      setIsConnected(false);
      return;
    }

    const handleMessage = (data: WebSocketMessage) => {
      console.log('useRealtimeMessages received:', data);
      
      if (data.type === 'new_message' && data.message) {
        const message = data.message as Message;
        console.log('New message for conversation:', message.conversation, 'current:', conversationId);
        
        // Only add if it's for the current conversation
        if (message.conversation === conversationId) {
          messagesRef.current.push(message);
          setNewMessages([...messagesRef.current]);
        }
      } else if (data.type === 'joined_conversation') {
        console.log('Successfully joined conversation:', data.conversation_id);
      }
    };

    // Connect to WebSocket
    webSocketService.connect({
      onOpen: () => {
        console.log('WebSocket opened, joining conversation:', conversationId);
        setIsConnected(true);
        // Join the conversation room
        webSocketService.joinConversation(conversationId);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onMessage: handleMessage,
    }).catch(error => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      // Leave conversation room
      if (webSocketService.isConnected()) {
        webSocketService.leaveConversation(conversationId);
      }
      messagesRef.current = [];
      setNewMessages([]);
    };
  }, [conversationId, hasToken]);

  const clearNewMessages = useCallback(() => {
    messagesRef.current = [];
    setNewMessages([]);
  }, []);

  return { newMessages, isConnected, clearNewMessages };
}

export function useRealtimeConversations() {
  const [updatedConversations, setUpdatedConversations] = useState<Map<string, Conversation>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const conversationsRef = useRef<Map<string, Conversation>>(new Map());

  useEffect(() => {
    const handleMessage = (data: WebSocketMessage) => {
      if (data.type === 'new_message_notification' && data.message) {
        // Update conversation with new message info
        const message = data.message as Message;
        const conversationId = data.conversation_id;
        
        // Create a partial conversation update
        const update: Partial<Conversation> = {
          id: conversationId,
          last_message: message.content,
          last_message_at: message.created_at,
          unread_count: 1, // This would need to be tracked properly
        };
        
        conversationsRef.current.set(conversationId, update as Conversation);
        setUpdatedConversations(new Map(conversationsRef.current));
      }
    };

    // Check if we have a token before connecting
    const token = tokenStorage.getAccessToken();
    if (!token) {
      console.log('No auth token available, skipping WebSocket connection');
      setIsConnected(false);
      return;
    }

    // Connect to WebSocket
    webSocketService.connect({
      onOpen: () => {
        setIsConnected(true);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onMessage: handleMessage,
    }).catch(error => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      conversationsRef.current.clear();
      setUpdatedConversations(new Map());
    };
  }, []);

  return { updatedConversations, isConnected };
}

export function useTypingIndicator(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isSetup = useRef(false);

  useEffect(() => {
    if (!conversationId) return;

    const handleMessage = (data: WebSocketMessage) => {
      if (data.type === 'typing_indicator' && data.conversation_id === conversationId) {
        const userId = data.user_id;
        const isTyping = data.is_typing;

        setTypingUsers(prev => {
          const newSet = new Set(prev);
          
          // Clear existing timeout for this user
          const existingTimeout = typingTimeouts.current.get(userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingTimeouts.current.delete(userId);
          }

          if (isTyping) {
            newSet.add(userId);
            
            // Set timeout to remove typing indicator after 3 seconds
            const timeout = setTimeout(() => {
              setTypingUsers(current => {
                const updated = new Set(current);
                updated.delete(userId);
                return updated;
              });
              typingTimeouts.current.delete(userId);
            }, 3000);
            
            typingTimeouts.current.set(userId, timeout);
          } else {
            newSet.delete(userId);
          }

          return newSet;
        });
      }
    };

    // Only setup WebSocket connection if not already connected
    if (!webSocketService.isConnected() && !isSetup.current) {
      isSetup.current = true;
      webSocketService.connect({
        onMessage: handleMessage,
      });
    } else {
      // If already connected, just update the message handler
      // This would require modifying the WebSocket service to support multiple handlers
    }

    return () => {
      // Clear all timeouts
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.clear();
      setTypingUsers(new Set());
    };
  }, [conversationId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (conversationId) {
      webSocketService.sendTypingIndicator(conversationId, isTyping);
    }
  }, [conversationId]);

  return { typingUsers, sendTyping };
}

// Hook for browser notifications
export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return permission;
  }, [permission]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    }
  }, []);

  return { permission, requestPermission, showNotification };
}
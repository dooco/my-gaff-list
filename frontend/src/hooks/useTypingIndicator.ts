import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { enhancedWebSocketService as webSocketService, WebSocketMessage } from '@/services/websocketEnhanced';

interface TypingUser {
  userId: string;
  username?: string;
  timestamp: number;
}

export function useTypingIndicator(conversationId: string | null) {
  const { isConnected, sendTypingIndicator } = useWebSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingSent = useRef<number>(0);
  const typingDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !isConnected) {
      return;
    }

    const handleMessage = (data: WebSocketMessage) => {
      if (data.type === 'typing_indicator' && data.conversation_id === conversationId) {
        const userId = data.user_id;
        const username = data.username;
        const isTyping = data.is_typing;

        setTypingUsers(prev => {
          const newMap = new Map(prev);
          
          // Clear existing timeout for this user
          const existingTimeout = typingTimeouts.current.get(userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingTimeouts.current.delete(userId);
          }

          if (isTyping) {
            // Add or update typing user
            newMap.set(userId, {
              userId,
              username,
              timestamp: Date.now(),
            });
            
            // Set timeout to remove typing indicator after 3 seconds
            const timeout = setTimeout(() => {
              setTypingUsers(current => {
                const updated = new Map(current);
                updated.delete(userId);
                return updated;
              });
              typingTimeouts.current.delete(userId);
            }, 3000);
            
            typingTimeouts.current.set(userId, timeout);
          } else {
            // Remove typing user
            newMap.delete(userId);
          }

          return newMap;
        });
      }
    };

    // Set up message handler
    webSocketService.connect({
      onMessage: handleMessage,
    });

    return () => {
      // Clear all timeouts
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.clear();
      setTypingUsers(new Map());
    };
  }, [conversationId, isConnected]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!conversationId || !isConnected) {
      return;
    }

    const now = Date.now();
    
    // Debounce typing indicators - don't send too frequently
    if (isTyping) {
      // Clear any pending stop typing
      if (typingDebounceTimeout.current) {
        clearTimeout(typingDebounceTimeout.current);
        typingDebounceTimeout.current = null;
      }

      // Only send if we haven't sent recently
      if (now - lastTypingSent.current > 1000) {
        sendTypingIndicator(conversationId, true);
        lastTypingSent.current = now;
      }

      // Set timeout to automatically send stop typing
      typingDebounceTimeout.current = setTimeout(() => {
        sendTypingIndicator(conversationId, false);
        lastTypingSent.current = 0;
        typingDebounceTimeout.current = null;
      }, 2000);
    } else {
      // Clear debounce timeout
      if (typingDebounceTimeout.current) {
        clearTimeout(typingDebounceTimeout.current);
        typingDebounceTimeout.current = null;
      }
      
      // Send stop typing immediately
      sendTypingIndicator(conversationId, false);
      lastTypingSent.current = 0;
    }
  }, [conversationId, isConnected, sendTypingIndicator]);

  const getTypingText = useCallback((): string | null => {
    if (typingUsers.size === 0) {
      return null;
    }

    const users = Array.from(typingUsers.values());
    const names = users.map(u => u.username || 'Someone').join(', ');
    
    if (users.length === 1) {
      return `${names} is typing...`;
    } else if (users.length === 2) {
      return `${names} are typing...`;
    } else {
      return `${users.length} people are typing...`;
    }
  }, [typingUsers]);

  return {
    typingUsers: Array.from(typingUsers.values()),
    sendTyping,
    getTypingText,
    isTyping: typingUsers.size > 0,
  };
}
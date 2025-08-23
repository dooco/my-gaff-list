'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { enhancedWebSocketService as webSocketService } from '@/services/websocketEnhanced';
import { useAuth } from '@/contexts/AuthContext';
import { tokenStorage } from '@/utils/tokenStorage';

interface WebSocketContextType {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, message: string) => void;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isAuthenticated, tokens } = useAuth();
  const [isConnected, setIsConnected] = React.useState(false);
  const connectionRef = useRef<boolean>(false);
  const lastTokenRef = useRef<string | null>(null);
  const mountedRef = useRef<boolean>(false);

  // Track if component is mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Connect/disconnect based on auth state
  useEffect(() => {
    const handleConnection = async () => {
      // Don't connect if component is not mounted
      if (!mountedRef.current) return;
      
      const currentToken = tokenStorage.getAccessToken();
      
      // Check if we need to reconnect (token changed or auth state changed)
      // Only connect if we actually have a token
      const shouldConnect = isAuthenticated && currentToken && currentToken !== 'undefined';
      const tokenChanged = currentToken !== lastTokenRef.current;
      
      if (shouldConnect && (!connectionRef.current || tokenChanged)) {
        // Silently attempt connection
        
        // Disconnect existing connection if token changed
        if (tokenChanged && connectionRef.current) {
          // Token changed, reconnecting...
          webSocketService.disconnect();
          connectionRef.current = false;
          setIsConnected(false);
        }
        
        try {
          await webSocketService.connect({
            onOpen: () => {
              connectionRef.current = true;
              setIsConnected(true);
            },
            onClose: () => {
              connectionRef.current = false;
              setIsConnected(false);
            },
            onError: (error) => {
              // Only log errors if they're not connection failures (which are expected when WS server is not running)
              if (error && typeof error === 'object' && Object.keys(error).length > 0) {
                console.warn('[WebSocketContext] WebSocket error:', error);
              }
              connectionRef.current = false;
              setIsConnected(false);
            }
          });
          
          lastTokenRef.current = currentToken;
        } catch (error) {
          // Silently fail if WebSocket server is not available
          connectionRef.current = false;
          setIsConnected(false);
        }
      } else if (!shouldConnect && connectionRef.current) {
        // User logged out or token removed
        webSocketService.disconnect();
        connectionRef.current = false;
        setIsConnected(false);
        lastTokenRef.current = null;
      }
    };

    handleConnection();
  }, [isAuthenticated, tokens]);

  // Listen for storage events (token changes from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'refresh_token') {
        // Force reconnection with new token
        const currentToken = tokenStorage.getAccessToken();
        if (currentToken !== lastTokenRef.current) {
          lastTokenRef.current = currentToken;
          if (currentToken) {
            connect();
          } else {
            disconnect();
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const connect = async () => {
    if (!isAuthenticated || connectionRef.current) {
      return;
    }

    try {
      await webSocketService.connect({
        onOpen: () => {
          connectionRef.current = true;
          setIsConnected(true);
        },
        onClose: () => {
          connectionRef.current = false;
          setIsConnected(false);
        },
        onError: () => {
          connectionRef.current = false;
          setIsConnected(false);
        }
      });
    } catch (error) {
      console.error('[WebSocketContext] Manual connect failed:', error);
    }
  };

  const disconnect = () => {
    webSocketService.disconnect();
    connectionRef.current = false;
    setIsConnected(false);
  };

  const joinConversation = (conversationId: string) => {
    if (isConnected) {
      webSocketService.joinConversation(conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (isConnected) {
      webSocketService.leaveConversation(conversationId);
    }
  };

  const sendMessage = (conversationId: string, message: string) => {
    if (isConnected) {
      webSocketService.sendMessage(conversationId, message);
    }
  };

  const sendTypingIndicator = (conversationId: string, isTyping: boolean) => {
    if (isConnected) {
      webSocketService.sendTypingIndicator(conversationId, isTyping);
    }
  };

  const value: WebSocketContextType = {
    isConnected,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTypingIndicator,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
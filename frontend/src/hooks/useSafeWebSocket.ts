import { useContext } from 'react';
import { WebSocketContext } from '@/contexts/WebSocketContext';

/**
 * Safe WebSocket hook that returns null if WebSocket context is not available
 * Use this for components that may be rendered on non-authenticated pages
 */
export function useSafeWebSocket() {
  try {
    const context = useContext(WebSocketContext);
    return context;
  } catch {
    // WebSocket context not available (user not authenticated)
    return null;
  }
}

/**
 * Returns a stub WebSocket interface for non-authenticated users
 */
export function useWebSocketStub() {
  return {
    isConnected: false,
    connect: async () => { /* no-op */ },
    disconnect: () => { /* no-op */ },
    joinConversation: (conversationId: string) => { /* no-op */ },
    leaveConversation: (conversationId: string) => { /* no-op */ },
    sendMessage: (conversationId: string, message: string) => { /* no-op */ },
    sendTypingIndicator: (conversationId: string, isTyping: boolean) => { /* no-op */ },
  };
}
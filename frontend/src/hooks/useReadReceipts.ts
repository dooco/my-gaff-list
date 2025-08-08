import { useEffect, useCallback } from 'react';
import { webSocketService, WebSocketMessage } from '@/services/websocket';

export function useReadReceipts(
  conversationId: string | null,
  onMessagesRead?: (messageIds: string[], userId: string) => void
) {
  useEffect(() => {
    if (!conversationId) return;

    const handleMessage = (data: WebSocketMessage) => {
      if (data.type === 'messages_read' && data.conversation_id === conversationId) {
        const messageIds = data.message_ids || [];
        const userId = data.user_id;
        
        if (onMessagesRead) {
          onMessagesRead(messageIds, userId);
        }
      }
    };

    // Listen for read receipt events
    // This assumes the WebSocket service is already connected
    // and we're just adding a listener
    if (webSocketService.isConnected()) {
      // TODO: Add support for multiple message handlers in WebSocket service
    }

    return () => {
      // Cleanup
    };
  }, [conversationId, onMessagesRead]);

  const markAsRead = useCallback((messageIds: string[]) => {
    if (conversationId) {
      webSocketService.markMessagesRead(conversationId, messageIds);
    }
  }, [conversationId]);

  return { markAsRead };
}
import { Conversation, Message } from '@/types/message';

type MessageListener = (message: Message) => void;
type ConversationListener = (conversation: Conversation) => void;
type TypingListener = (data: { conversationId: string; userId: string; isTyping: boolean }) => void;

class RealtimeService {
  private messageListeners: Map<string, Set<MessageListener>> = new Map();
  private conversationListeners: Set<ConversationListener> = new Set();
  private typingListeners: Set<TypingListener> = new Set();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastMessageTimestamps: Map<string, string> = new Map();

  // Polling intervals in milliseconds
  private readonly CONVERSATION_LIST_INTERVAL = 10000; // 10 seconds
  private readonly MESSAGE_THREAD_INTERVAL = 3000; // 3 seconds
  private readonly TYPING_TIMEOUT = 3000; // 3 seconds

  // Subscribe to new messages in a conversation
  subscribeToMessages(conversationId: string, listener: MessageListener) {
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, new Set());
      this.startMessagePolling(conversationId);
    }
    this.messageListeners.get(conversationId)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.messageListeners.get(conversationId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.stopMessagePolling(conversationId);
          this.messageListeners.delete(conversationId);
        }
      }
    };
  }

  // Subscribe to conversation list updates
  subscribeToConversations(listener: ConversationListener) {
    this.conversationListeners.add(listener);
    if (this.conversationListeners.size === 1) {
      this.startConversationPolling();
    }

    // Return unsubscribe function
    return () => {
      this.conversationListeners.delete(listener);
      if (this.conversationListeners.size === 0) {
        this.stopConversationPolling();
      }
    };
  }

  // Subscribe to typing indicators
  subscribeToTyping(listener: TypingListener) {
    this.typingListeners.add(listener);

    return () => {
      this.typingListeners.delete(listener);
    };
  }

  // Send typing indicator
  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    // In a real WebSocket implementation, this would send to the server
    // For now, we'll just emit locally for demonstration
    const userId = this.getCurrentUserId();
    if (userId) {
      this.notifyTypingListeners({ conversationId, userId, isTyping });
    }
  }

  private async startMessagePolling(conversationId: string) {
    const poll = async () => {
      try {
        const token = this.getAuthToken();
        if (!token) return;

        const lastTimestamp = this.lastMessageTimestamps.get(conversationId);
        const url = lastTimestamp 
          ? `/api/messages/${conversationId}/messages/?since=${lastTimestamp}`
          : `/api/messages/${conversationId}/messages/`;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const messages: Message[] = data.results || [];
          
          if (messages.length > 0) {
            // Update last timestamp
            const latestMessage = messages[messages.length - 1];
            this.lastMessageTimestamps.set(conversationId, latestMessage.created_at);

            // Notify listeners
            const listeners = this.messageListeners.get(conversationId);
            if (listeners) {
              messages.forEach(message => {
                listeners.forEach(listener => listener(message));
              });
            }
          }
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const interval = setInterval(poll, this.MESSAGE_THREAD_INTERVAL);
    this.pollingIntervals.set(`messages-${conversationId}`, interval);
  }

  private stopMessagePolling(conversationId: string) {
    const interval = this.pollingIntervals.get(`messages-${conversationId}`);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(`messages-${conversationId}`);
    }
    this.lastMessageTimestamps.delete(conversationId);
  }

  private async startConversationPolling() {
    const poll = async () => {
      try {
        const token = this.getAuthToken();
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/conversations/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const conversations: Conversation[] = data.results || [];
          
          // Notify all conversation listeners
          this.conversationListeners.forEach(listener => {
            conversations.forEach(conversation => listener(conversation));
          });
        }
      } catch (error) {
        console.error('Error polling conversations:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const interval = setInterval(poll, this.CONVERSATION_LIST_INTERVAL);
    this.pollingIntervals.set('conversations', interval);
  }

  private stopConversationPolling() {
    const interval = this.pollingIntervals.get('conversations');
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete('conversations');
    }
  }

  private notifyTypingListeners(data: { conversationId: string; userId: string; isTyping: boolean }) {
    this.typingListeners.forEach(listener => listener(data));
  }

  private getAuthToken(): string | null {
    // Get token from localStorage or context
    return localStorage.getItem('accessToken');
  }

  private getCurrentUserId(): string | null {
    // Get current user ID from localStorage or context
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id;
      } catch {
        return null;
      }
    }
    return null;
  }

  // Clean up all intervals
  cleanup() {
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    this.messageListeners.clear();
    this.conversationListeners.clear();
    this.typingListeners.clear();
    this.lastMessageTimestamps.clear();
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
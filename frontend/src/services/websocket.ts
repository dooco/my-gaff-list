import { Conversation, Message } from '@/types/message';
import { tokenStorage } from '@/utils/tokenStorage';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface ConnectionOptions {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (data: WebSocketMessage) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private options: ConnectionOptions;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose: boolean = false;
  private messageQueue: WebSocketMessage[] = [];
  private connectionPromise: Promise<void> | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private static instance: WebSocketService | null = null;

  constructor() {
    if (WebSocketService.instance) {
      console.log('WebSocket: Returning existing instance');
      return WebSocketService.instance;
    }
    
    console.log('WebSocket: Creating new instance');
    // WebSocket URL - replace http with ws
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    this.url = baseUrl.replace(/^http/, 'ws') + '/ws/messages/';
    this.options = {};
    
    WebSocketService.instance = this;
  }

  connect(options: ConnectionOptions = {}): Promise<void> {
    this.options = options;
    this.isManualClose = false;

    // If already connected, just return success
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected, skipping reconnection');
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      console.log('WebSocket: Connection already in progress');
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const token = this.getAuthToken();
        if (!token) {
          console.error('WebSocket: No token found in localStorage');
          this.connectionPromise = null;
          reject(new Error('No authentication token found'));
          return;
        }

        console.log('WebSocket: Connecting with token:', token.substring(0, 20) + '...');
        
        // Include token in URL query params for WebSocket
        const wsUrl = `${this.url}?token=${token}`;
        console.log('WebSocket: Connecting to', wsUrl.replace(token, 'TOKEN_HIDDEN'));
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          
          // Process queued messages
          this.processMessageQueue();
          
          // Start ping interval to keep connection alive
          this.startPingInterval();
          
          if (this.options.onOpen) {
            this.options.onOpen();
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.error('WebSocket readyState:', this.ws?.readyState);
          this.connectionPromise = null;
          if (this.options.onError) {
            this.options.onError(error);
          }
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          console.log('Close event details:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          
          // Common close codes:
          // 1000 - Normal closure
          // 1001 - Going away
          // 1002 - Protocol error
          // 1003 - Unsupported data
          // 1006 - Abnormal closure
          // 4001 - Our custom unauthorized code
          
          if (event.code === 4001) {
            console.error('WebSocket authentication failed');
          }
          
          this.stopPingInterval();
          this.connectionPromise = null;
          
          if (this.options.onClose) {
            this.options.onClose(event);
          }

          // Attempt to reconnect if not manually closed
          if (!this.isManualClose && this.shouldReconnect()) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect() {
    this.isManualClose = true;
    this.stopPingInterval();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Sending message:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket: Not connected, readyState:', this.ws?.readyState);
      // Check if we have a token before queuing
      const token = this.getAuthToken();
      if (!token) {
        console.warn('WebSocket: Cannot send message, no authentication token');
        return;
      }
      
      // Queue message if not connected
      this.messageQueue.push(message);
      
      // Try to reconnect if not already attempting
      if (!this.connectionPromise) {
        this.connect(this.options).catch(err => {
          console.error('WebSocket: Failed to reconnect:', err);
        });
      }
    }
  }

  // Specific message methods
  joinConversation(conversationId: string) {
    this.send({
      type: 'join_conversation',
      conversation_id: conversationId,
    });
  }

  leaveConversation(conversationId: string) {
    this.send({
      type: 'leave_conversation',
      conversation_id: conversationId,
    });
  }

  sendMessage(conversationId: string, message: string) {
    this.send({
      type: 'send_message',
      conversation_id: conversationId,
      content: message,
    });
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    this.send({
      type: 'typing',
      conversation_id: conversationId,
      is_typing: isTyping,
    });
  }

  markMessagesRead(conversationId: string, messageIds: string[] = []) {
    this.send({
      type: 'mark_read',
      conversation_id: conversationId,
      message_ids: messageIds,
    });
  }

  // Private methods
  private handleMessage(data: WebSocketMessage) {
    console.log('WebSocket: Received message:', data);
    
    if (data.type === 'pong') {
      // Handle pong response
      return;
    }

    if (this.options.onMessage) {
      this.options.onMessage(data);
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private shouldReconnect(): boolean {
    const maxAttempts = this.options.maxReconnectAttempts || 5;
    return this.reconnectAttempts < maxAttempts;
  }

  private scheduleReconnect() {
    const interval = this.options.reconnectInterval || 5000;
    const backoffInterval = Math.min(interval * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Scheduling reconnect in ${backoffInterval}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.options);
    }, backoffInterval);
  }

  private startPingInterval() {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private getAuthToken(): string | null {
    // Use tokenStorage for consistent token retrieval
    return tokenStorage.getAccessToken();
  }

  // Check connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
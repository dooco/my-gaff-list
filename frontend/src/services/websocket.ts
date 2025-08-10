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
  onConnectionStateChange?: (state: ConnectionState) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableOfflineQueue?: boolean;
  maxQueueSize?: number;
}

export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface QueuedMessage {
  id: string;
  message: WebSocketMessage;
  timestamp: number;
  retries: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private options: ConnectionOptions;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose: boolean = false;
  private messageQueue: QueuedMessage[] = [];
  private connectionPromise: Promise<void> | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private static instance: WebSocketService | null = null;
  private lastPingTime: number = 0;
  private missedPongs: number = 0;
  private readonly MAX_MISSED_PONGS = 3;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly PONG_TIMEOUT = 5000; // 5 seconds to wait for pong
  private readonly QUEUE_STORAGE_KEY = 'websocket_message_queue';
  private readonly MAX_QUEUE_AGE = 24 * 60 * 60 * 1000; // 24 hours

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
    
    // Load queued messages from localStorage
    this.loadQueueFromStorage();
    
    // Set up visibility change listener for connection management
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    
    // Set up online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
    
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
          this.missedPongs = 0;
          this.setConnectionState(ConnectionState.CONNECTED);
          
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
          this.setConnectionState(ConnectionState.ERROR);
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
          
          if (!this.isManualClose) {
            this.setConnectionState(ConnectionState.DISCONNECTED);
          }
          
          if (this.options.onClose) {
            this.options.onClose(event);
          }

          // Attempt to reconnect if not manually closed
          if (!this.isManualClose && this.shouldReconnect()) {
            this.setConnectionState(ConnectionState.RECONNECTING);
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
      
      // Queue message if offline queue is enabled
      if (this.options.enableOfflineQueue !== false) {
        this.queueMessage(message);
      }
      
      // Try to reconnect if not already attempting
      if (!this.connectionPromise && this.connectionState !== ConnectionState.CONNECTING) {
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
      this.handlePong();
      return;
    }

    if (this.options.onMessage) {
      this.options.onMessage(data);
    }
  }

  private processMessageQueue() {
    const now = Date.now();
    const validMessages: QueuedMessage[] = [];
    
    // Filter out old messages and process valid ones
    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift();
      if (queuedMessage) {
        // Skip messages older than MAX_QUEUE_AGE
        if (now - queuedMessage.timestamp < this.MAX_QUEUE_AGE) {
          this.send(queuedMessage.message);
          validMessages.push(queuedMessage);
        }
      }
    }
    
    // Clear storage after processing
    this.clearQueueStorage();
  }

  private shouldReconnect(): boolean {
    const maxAttempts = this.options.maxReconnectAttempts || 5;
    return this.reconnectAttempts < maxAttempts;
  }

  private scheduleReconnect() {
    const interval = this.options.reconnectInterval || 1000; // Start with 1 second
    const backoffMultiplier = Math.min(Math.pow(2, this.reconnectAttempts), 32); // Cap at 2^5 = 32
    const backoffInterval = Math.min(interval * backoffMultiplier, 30000); // Max 30 seconds
    const jitter = Math.random() * 1000; // Add 0-1 second jitter

    console.log(`Scheduling reconnect in ${backoffInterval + jitter}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.options);
    }, backoffInterval + jitter);
  }

  private startPingInterval() {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping' });
        
        // Set timeout for pong response
        this.pongTimeout = setTimeout(() => {
          this.missedPongs++;
          console.warn(`Missed pong response (${this.missedPongs}/${this.MAX_MISSED_PONGS})`);
          
          if (this.missedPongs >= this.MAX_MISSED_PONGS) {
            console.error('Too many missed pongs, closing connection');
            this.ws?.close(1000, 'Ping timeout');
          }
        }, this.PONG_TIMEOUT);
      }
    }, this.PING_INTERVAL);
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
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

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // New private helper methods
  private setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      if (this.options.onConnectionStateChange) {
        this.options.onConnectionStateChange(state);
      }
    }
  }

  private handlePong() {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    this.missedPongs = 0;
    const latency = Date.now() - this.lastPingTime;
    console.log(`Pong received, latency: ${latency}ms`);
  }

  private queueMessage(message: WebSocketMessage) {
    const maxQueueSize = this.options.maxQueueSize || 100;
    
    // Check queue size
    if (this.messageQueue.length >= maxQueueSize) {
      // Remove oldest message
      this.messageQueue.shift();
    }
    
    const queuedMessage: QueuedMessage = {
      id: `${Date.now()}_${Math.random()}`,
      message,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.messageQueue.push(queuedMessage);
    this.saveQueueToStorage();
    
    console.log(`Message queued for sending when connection is restored (queue size: ${this.messageQueue.length})`);
  }

  private saveQueueToStorage() {
    if (typeof localStorage !== 'undefined' && this.options.enableOfflineQueue !== false) {
      try {
        localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.messageQueue));
      } catch (e) {
        console.error('Failed to save message queue to localStorage:', e);
      }
    }
  }

  private loadQueueFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.QUEUE_STORAGE_KEY);
        if (stored) {
          const queue = JSON.parse(stored) as QueuedMessage[];
          const now = Date.now();
          // Filter out old messages
          this.messageQueue = queue.filter(msg => now - msg.timestamp < this.MAX_QUEUE_AGE);
          if (this.messageQueue.length > 0) {
            console.log(`Loaded ${this.messageQueue.length} queued messages from storage`);
          }
        }
      } catch (e) {
        console.error('Failed to load message queue from localStorage:', e);
      }
    }
  }

  private clearQueueStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.QUEUE_STORAGE_KEY);
      } catch (e) {
        console.error('Failed to clear message queue from localStorage:', e);
      }
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, reduce activity
      console.log('Page hidden, reducing WebSocket activity');
    } else {
      // Page is visible, check connection
      console.log('Page visible, checking WebSocket connection');
      if (!this.isConnected() && !this.isManualClose) {
        this.connect(this.options).catch(err => {
          console.error('Failed to reconnect on visibility change:', err);
        });
      }
    }
  }

  private handleOnline() {
    console.log('Network online, attempting to reconnect WebSocket');
    if (!this.isConnected() && !this.isManualClose) {
      this.reconnectAttempts = 0; // Reset attempts for immediate reconnection
      this.connect(this.options).catch(err => {
        console.error('Failed to reconnect when online:', err);
      });
    }
  }

  private handleOffline() {
    console.log('Network offline, WebSocket will queue messages');
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  // Public method to manually trigger reconnection
  reconnect() {
    if (!this.isConnected() && !this.connectionPromise) {
      this.reconnectAttempts = 0;
      return this.connect(this.options);
    }
    return Promise.resolve();
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
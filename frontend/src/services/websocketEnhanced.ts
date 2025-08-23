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
  enableFallback?: boolean;
}

interface HealthMetrics {
  connected: boolean;
  connectionAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  messagesSent: number;
  messagesReceived: number;
  lastMessageAt: Date | null;
  latency: number;
  reconnectCount: number;
  errors: Array<{ timestamp: Date; error: string }>;
}

class EnhancedWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private options: ConnectionOptions;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose: boolean = false;
  private messageQueue: WebSocketMessage[] = [];
  private connectionPromise: Promise<void> | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private static instance: EnhancedWebSocketService | null = null;
  
  // Health monitoring
  private health: HealthMetrics = {
    connected: false,
    connectionAttempts: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    messagesSent: 0,
    messagesReceived: 0,
    lastMessageAt: null,
    latency: 0,
    reconnectCount: 0,
    errors: [],
  };

  // Fallback HTTP client
  private fallbackMode: boolean = false;
  private httpPollingInterval: NodeJS.Timeout | null = null;

  // Listeners
  private messageHandlers: Set<(data: WebSocketMessage) => void> = new Set();
  private healthListeners: Set<(health: HealthMetrics) => void> = new Set();

  constructor() {
    if (EnhancedWebSocketService.instance) {
      return EnhancedWebSocketService.instance;
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    this.url = baseUrl.replace(/^http/, 'ws') + '/ws/messages/';
    this.options = {};
    
    EnhancedWebSocketService.instance = this;
  }

  connect(options: ConnectionOptions = {}): Promise<void> {
    this.options = { ...this.options, ...options };
    this.isManualClose = false;
    this.health.connectionAttempts++;

    // Add message handler to the set
    if (options.onMessage) {
      this.messageHandlers.add(options.onMessage);
    }

    // If already connected, just return success
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return Promise.resolve();
    }

    // If connection is in progress, return existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const token = this.getAuthToken();
        if (!token) {
          // Silently fail if no auth token - this is expected on public pages
          this.state = 'disconnected';
          reject(new Error('No authentication token'));
          return;
        }

        // Construct WebSocket URL with auth token
        const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
        
        console.log('[WebSocket] Attempting connection...');
        this.ws = new WebSocket(wsUrl);

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.error('[WebSocket] Connection timeout');
            this.ws.close();
            this.handleConnectionError('Connection timeout');
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('[WebSocket] Connected successfully');
          
          // Update health metrics
          this.health.connected = true;
          this.health.lastConnectedAt = new Date();
          this.notifyHealthListeners();
          
          // Reset reconnect attempts
          this.reconnectAttempts = 0;
          this.fallbackMode = false;
          
          // Start ping interval
          this.startPingInterval();
          this.startHealthCheck();
          
          // Process queued messages
          this.processMessageQueue();
          
          // Trigger callback
          this.options.onOpen?.();
          
          // Clear connection promise
          this.connectionPromise = null;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WebSocket] Message received:', data);
            
            // Update health metrics
            this.health.messagesReceived++;
            this.health.lastMessageAt = new Date();
            
            // Handle ping/pong for latency measurement
            if (data.type === 'pong' && data.timestamp) {
              this.health.latency = Date.now() - data.timestamp;
            }
            
            // Notify all message handlers
            this.messageHandlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error('[WebSocket] Error in message handler:', error);
              }
            });
            
            this.notifyHealthListeners();
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
            this.recordError('Message parsing error');
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          // Only log actual errors, not connection failures
          if (error && typeof error === 'object' && Object.keys(error).length > 0) {
            console.warn('[WebSocket] Connection error:', error);
          }
          this.recordError('WebSocket error');
          this.options.onError?.(error);
          this.connectionPromise = null;
          reject(error);
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          // Only log if it's an abnormal closure
          if (event.code !== 1000 && event.code !== 1001) {
            console.log('[WebSocket] Connection closed:', event.code, event.reason);
          }
          
          // Update health metrics
          this.health.connected = false;
          this.health.lastDisconnectedAt = new Date();
          this.notifyHealthListeners();
          
          // Stop intervals
          this.stopPingInterval();
          this.stopHealthCheck();
          
          // Clear WebSocket reference
          this.ws = null;
          this.connectionPromise = null;
          
          // Trigger callback
          this.options.onClose?.(event);
          
          // Handle reconnection or fallback
          if (!this.isManualClose) {
            if (this.shouldUseFallback()) {
              this.enableHttpFallback();
            } else {
              this.scheduleReconnect();
            }
          }
        };
      } catch (error) {
        console.error('[WebSocket] Connection setup error:', error);
        this.recordError('Connection setup error');
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private handleConnectionError(errorMessage: string) {
    this.recordError(errorMessage);
    
    if (this.options.enableFallback !== false && this.shouldUseFallback()) {
      console.log('[WebSocket] Falling back to HTTP polling');
      this.enableHttpFallback();
    }
  }

  private shouldUseFallback(): boolean {
    // Use fallback after 3 failed attempts or if explicitly requested
    return this.reconnectAttempts >= 3 || this.options.enableFallback === true;
  }

  private enableHttpFallback() {
    this.fallbackMode = true;
    console.log('[WebSocket] Enabling HTTP fallback mode');
    
    // Start HTTP polling for messages
    const pollMessages = async () => {
      try {
        const token = this.getAuthToken();
        if (!token) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/messages/poll/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Process messages as if they came from WebSocket
          if (data.messages && Array.isArray(data.messages)) {
            data.messages.forEach((message: any) => {
              this.messageHandlers.forEach(handler => {
                handler({
                  type: 'new_message',
                  message,
                });
              });
            });
          }
        }
      } catch (error) {
        console.error('[WebSocket] HTTP polling error:', error);
      }
    };

    // Poll every 3 seconds
    this.httpPollingInterval = setInterval(pollMessages, 3000);
    
    // Try to reconnect WebSocket in background
    setTimeout(() => {
      if (this.fallbackMode) {
        this.attemptWebSocketReconnect();
      }
    }, 30000); // Try after 30 seconds
  }

  private disableHttpFallback() {
    if (this.httpPollingInterval) {
      clearInterval(this.httpPollingInterval);
      this.httpPollingInterval = null;
    }
    this.fallbackMode = false;
    console.log('[WebSocket] HTTP fallback disabled');
  }

  private async attemptWebSocketReconnect() {
    if (!this.fallbackMode) return;
    
    try {
      await this.connect(this.options);
      // If successful, disable fallback
      this.disableHttpFallback();
    } catch (error) {
      console.log('[WebSocket] Background reconnect failed, continuing with fallback');
      // Schedule another attempt
      setTimeout(() => {
        if (this.fallbackMode) {
          this.attemptWebSocketReconnect();
        }
      }, 60000); // Try again after 1 minute
    }
  }

  private scheduleReconnect() {
    const maxAttempts = this.options.maxReconnectAttempts ?? 10;
    
    if (this.reconnectAttempts >= maxAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.recordError('Max reconnection attempts reached');
      // Enable fallback mode
      this.enableHttpFallback();
      return;
    }

    const interval = Math.min(
      (this.options.reconnectInterval ?? 1000) * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );
    
    this.reconnectAttempts++;
    this.health.reconnectCount++;
    
    console.log(`[WebSocket] Reconnecting in ${interval}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.options);
    }, interval);
  }

  disconnect() {
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopPingInterval();
    this.stopHealthCheck();
    this.disableHttpFallback();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    // Clear message handlers
    this.messageHandlers.clear();
    
    // Reset health metrics
    this.health.connected = false;
    this.health.lastDisconnectedAt = new Date();
    this.notifyHealthListeners();
    
    console.log('[WebSocket] Manually disconnected');
  }

  send(data: WebSocketMessage): boolean {
    // If in fallback mode, use HTTP
    if (this.fallbackMode) {
      return this.sendViaHttp(data);
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Not connected, queueing message');
      this.messageQueue.push(data);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(data));
      this.health.messagesSent++;
      console.log('[WebSocket] Message sent:', data);
      return true;
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error);
      this.recordError('Message send error');
      this.messageQueue.push(data);
      return false;
    }
  }

  private sendViaHttp(data: WebSocketMessage): boolean {
    const token = this.getAuthToken();
    if (!token) return false;

    // Send via HTTP as fallback
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/messages/send/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch(error => {
      console.error('[WebSocket] HTTP send error:', error);
    });

    return true;
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Health monitoring methods
  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      // Check connection health
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const now = new Date();
        const lastMessageAge = this.health.lastMessageAt 
          ? now.getTime() - this.health.lastMessageAt.getTime()
          : Infinity;
        
        // If no message received in 60 seconds, consider unhealthy
        if (lastMessageAge > 60000) {
          console.warn('[WebSocket] Connection appears unhealthy, no messages for 60s');
          this.reconnect();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.send({
        type: 'ping',
        timestamp: Date.now(),
      });
    }, 25000); // Ping every 25 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private recordError(error: string) {
    this.health.errors.push({
      timestamp: new Date(),
      error,
    });
    
    // Keep only last 10 errors
    if (this.health.errors.length > 10) {
      this.health.errors.shift();
    }
    
    this.notifyHealthListeners();
  }

  private notifyHealthListeners() {
    this.healthListeners.forEach(listener => {
      try {
        listener({ ...this.health });
      } catch (error) {
        console.error('[WebSocket] Error in health listener:', error);
      }
    });
  }

  // Public methods for health monitoring
  subscribeToHealth(listener: (health: HealthMetrics) => void): () => void {
    this.healthListeners.add(listener);
    // Send current health immediately
    listener({ ...this.health });
    
    return () => {
      this.healthListeners.delete(listener);
    };
  }

  getHealth(): HealthMetrics {
    return { ...this.health };
  }

  reconnect() {
    console.log('[WebSocket] Manual reconnection requested');
    this.disconnect();
    this.isManualClose = false;
    return this.connect(this.options);
  }

  // Helper methods
  private getAuthToken(): string | null {
    return tokenStorage.getAccessToken();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  // Convenience methods for messaging
  joinConversation(conversationId: string) {
    return this.send({
      type: 'join_conversation',
      conversation_id: conversationId,
    });
  }

  leaveConversation(conversationId: string) {
    return this.send({
      type: 'leave_conversation',
      conversation_id: conversationId,
    });
  }

  sendMessage(conversationId: string, message: string) {
    return this.send({
      type: 'send_message',
      conversation_id: conversationId,
      content: message,
    });
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    return this.send({
      type: 'typing',
      conversation_id: conversationId,
      is_typing: isTyping,
    });
  }

  markMessagesRead(conversationId: string, messageIds: string[]) {
    return this.send({
      type: 'mark_read',
      conversation_id: conversationId,
      message_ids: messageIds,
    });
  }

  // Message handler management
  addMessageHandler(handler: (data: WebSocketMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler: (data: WebSocketMessage) => void): void {
    this.messageHandlers.delete(handler);
  }

  // Health listener management
  addHealthListener(listener: (health: HealthMetrics) => void): void {
    this.healthListeners.add(listener);
  }

  removeHealthListener(listener: (health: HealthMetrics) => void): void {
    this.healthListeners.delete(listener);
  }

  // Get current health metrics
  getHealthMetrics(): HealthMetrics {
    return { ...this.health };
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
export const enhancedWebSocketService = new EnhancedWebSocketService();
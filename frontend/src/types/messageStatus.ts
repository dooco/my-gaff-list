export enum MessageStatus {
  QUEUED = 'queued',      // Message is queued for sending (offline)
  SENDING = 'sending',    // Message is being sent
  SENT = 'sent',         // Message sent to server
  DELIVERED = 'delivered', // Message delivered to recipient's device
  READ = 'read',         // Message read by recipient
  FAILED = 'failed'      // Message failed to send
}

export interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatus;
  timestamp: number;
  error?: string;
}

export interface MessageWithStatus {
  id: string;
  tempId?: string;
  content: string;
  status: MessageStatus;
  timestamp: number;
  error?: string;
}
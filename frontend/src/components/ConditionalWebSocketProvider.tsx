'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

interface ConditionalWebSocketProviderProps {
  children: ReactNode;
}

export function ConditionalWebSocketProvider({ children }: ConditionalWebSocketProviderProps) {
  const { isAuthenticated } = useAuth();
  
  // Only wrap with WebSocketProvider if user is authenticated
  if (isAuthenticated) {
    return <WebSocketProvider>{children}</WebSocketProvider>;
  }
  
  // For unauthenticated users, just pass through the children
  return <>{children}</>;
}
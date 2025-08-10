import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Message } from '@/types/message';
import { MessageStatus } from '@/types/messageStatus';
import EnhancedMessageStatus from './EnhancedMessageStatus';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface VirtualMessageListProps {
  messages: Array<Message & { status?: MessageStatus; error?: string }>;
  onRetryMessage?: (messageId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  recipientName?: string;
  recipientAvatar?: string;
}

interface VisibleRange {
  start: number;
  end: number;
}

const ITEM_HEIGHT = 80; // Approximate height of a message
const BUFFER_SIZE = 5; // Number of items to render outside visible area
const SCROLL_THRESHOLD = 100; // Pixels from top to trigger load more

export default function VirtualMessageList({
  messages,
  onRetryMessage,
  onLoadMore,
  hasMore = false,
  loading = false,
  recipientName = 'User',
  recipientAvatar
}: VirtualMessageListProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({ start: 0, end: 20 });
  const [containerHeight, setContainerHeight] = useState(600);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Calculate visible range based on scroll position
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;

    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const end = Math.min(
      messages.length,
      Math.ceil((scrollTop + height) / ITEM_HEIGHT) + BUFFER_SIZE
    );

    setVisibleRange({ start, end });

    // Check if at bottom
    const isNearBottom = 
      containerRef.current.scrollHeight - scrollTop - height < 50;
    setIsAtBottom(isNearBottom);

    // Check if should load more (scrolled near top)
    if (scrollTop < SCROLL_THRESHOLD && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [messages.length, hasMore, loading, onLoadMore]);

  // Handle scroll events with throttling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        calculateVisibleRange();
        scrollPositionRef.current = container.scrollTop;
        rafId = null;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [calculateVisibleRange]);

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
        calculateVisibleRange();
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [calculateVisibleRange]);

  // Auto-scroll to bottom when new messages arrive (if already at bottom)
  useEffect(() => {
    if (isAtBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length, isAtBottom]);

  // Initial calculation
  useEffect(() => {
    calculateVisibleRange();
  }, [messages, calculateVisibleRange]);

  const renderMessage = (message: Message & { status?: MessageStatus; error?: string }, index: number) => {
    const isOwnMessage = message.sender === user?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !previousMessage || previousMessage.sender !== message.sender;
    const messageTime = formatDistanceToNow(new Date(message.created_at), { addSuffix: false });

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 px-4`}
        style={{
          position: 'absolute',
          top: index * ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
        }}
      >
        <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[70%]`}>
          {!isOwnMessage && showAvatar && (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
              {recipientAvatar ? (
                <img 
                  src={recipientAvatar} 
                  alt={recipientName}
                  className="w-full h-full rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
              )}
            </div>
          )}
          
          {!isOwnMessage && !showAvatar && (
            <div className="w-8 flex-shrink-0" />
          )}

          <div
            className={`
              relative px-4 py-2 rounded-2xl
              ${isOwnMessage 
                ? 'bg-blue-500 text-white rounded-br-sm' 
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }
            `}
          >
            <p className="text-sm whitespace-pre-wrap break-words line-clamp-2">
              {message.content}
            </p>
            
            <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                {messageTime}
              </span>
              
              {isOwnMessage && message.status && (
                <EnhancedMessageStatus
                  status={message.status}
                  error={message.error}
                  onRetry={() => onRetryMessage?.(message.id)}
                  className={isOwnMessage ? 'text-blue-200' : ''}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const visibleMessages = messages.slice(visibleRange.start, visibleRange.end);
  const totalHeight = messages.length * ITEM_HEIGHT;

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gray-50 relative"
      style={{ height: containerHeight }}
    >
      {/* Loading indicator at top */}
      {loading && (
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur text-center py-2 border-b">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading earlier messages...
          </div>
        </div>
      )}

      {/* Virtual scroll container */}
      <div 
        style={{ 
          height: totalHeight,
          position: 'relative'
        }}
      >
        {messages.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation!</p>
            </div>
          </div>
        ) : (
          visibleMessages.map((message, virtualIndex) => {
            const actualIndex = visibleRange.start + virtualIndex;
            return renderMessage(message, actualIndex);
          })
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-4 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}
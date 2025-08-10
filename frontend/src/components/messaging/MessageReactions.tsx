import React, { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import EmojiPicker from './EmojiPicker';

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  has_reacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  isOwnMessage?: boolean;
}

export default function MessageReactions({
  reactions,
  onAddReaction,
  onRemoveReaction,
  isOwnMessage = false
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  const handleReactionClick = (reaction: Reaction) => {
    if (reaction.has_reacted) {
      onRemoveReaction(reaction.emoji);
    } else {
      onAddReaction(reaction.emoji);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onAddReaction(emoji);
    setShowEmojiPicker(false);
  };

  if (reactions.length === 0 && !showEmojiPicker) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction)}
          onMouseEnter={() => setHoveredReaction(reaction.emoji)}
          onMouseLeave={() => setHoveredReaction(null)}
          className={`
            relative inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
            transition-all transform hover:scale-110
            ${reaction.has_reacted 
              ? 'bg-blue-100 border border-blue-300 text-blue-700' 
              : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          <span className="text-sm">{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
          
          {/* Tooltip showing who reacted */}
          {hoveredReaction === reaction.emoji && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {reaction.users.slice(0, 3).join(', ')}
                {reaction.count > 3 && ` and ${reaction.count - 3} more`}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
          )}
        </button>
      ))}
      
      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Add reaction"
        >
          <PlusIcon className="h-4 w-4 text-gray-600" />
        </button>
        
        {showEmojiPicker && (
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
            position="top"
            align={isOwnMessage ? 'right' : 'left'}
          />
        )}
      </div>
    </div>
  );
}
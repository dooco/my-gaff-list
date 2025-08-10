import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  PencilIcon, 
  TrashIcon,
  EllipsisVerticalIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import MessageReactions from './MessageReactions';
import MessageEditForm from './MessageEditForm';
import { Message } from '@/types/message';

interface EnhancedMessageProps {
  message: Message & {
    reactions?: any[];
    reaction_summary?: any[];
    can_edit?: boolean;
    can_delete?: boolean;
    is_deleted?: boolean;
    deleted_at?: string;
    deletion_type?: string;
  };
  isOwnMessage: boolean;
  showAvatar: boolean;
  recipientName?: string;
  recipientAvatar?: string;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export default function EnhancedMessage({
  message,
  isOwnMessage,
  showAvatar,
  recipientName,
  recipientAvatar,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction
}: EnhancedMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const messageTime = formatDistanceToNow(new Date(message.created_at), { addSuffix: false });

  const handleEdit = async (content: string) => {
    await onEdit(message.id, content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const confirmDelete = () => {
    onDelete(message.id);
    setShowDeleteConfirm(false);
  };

  // Handle deleted messages
  if (message.is_deleted) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[70%]`}>
          {!isOwnMessage && showAvatar && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
          )}
          {!isOwnMessage && !showAvatar && (
            <div className="w-8 flex-shrink-0" />
          )}
          
          <div className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-500 italic">
            This message was deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[70%]`}>
        {!isOwnMessage && showAvatar && (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
            {recipientAvatar ? (
              <img 
                src={recipientAvatar} 
                alt={recipientName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
            )}
          </div>
        )}
        
        {!isOwnMessage && !showAvatar && (
          <div className="w-8 flex-shrink-0" />
        )}

        <div className="relative">
          <div
            className={`
              relative px-4 py-2 rounded-2xl
              ${isOwnMessage 
                ? 'bg-blue-500 text-white rounded-br-sm' 
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }
            `}
          >
            {/* Message menu */}
            {(message.can_edit || message.can_delete) && (
              <div className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      {message.can_edit && (
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 px-3 py-1 hover:bg-gray-100 w-full text-left text-sm"
                        >
                          <PencilIcon className="h-3 w-3" />
                          Edit
                        </button>
                      )}
                      {message.can_delete && (
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-2 px-3 py-1 hover:bg-gray-100 w-full text-left text-sm text-red-600"
                        >
                          <TrashIcon className="h-3 w-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message content or edit form */}
            {isEditing ? (
              <MessageEditForm
                initialContent={message.content}
                onSave={handleEdit}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                
                <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                    {messageTime}
                  </span>
                  
                  {message.is_edited && (
                    <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                      (edited)
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Reactions */}
          {message.reaction_summary && message.reaction_summary.length > 0 && (
            <MessageReactions
              reactions={message.reaction_summary}
              onAddReaction={(emoji) => onAddReaction(message.id, emoji)}
              onRemoveReaction={(emoji) => onRemoveReaction(message.id, emoji)}
              isOwnMessage={isOwnMessage}
            />
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Message?</h3>
            <p className="text-gray-600 mb-4">
              This message will be deleted for everyone. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
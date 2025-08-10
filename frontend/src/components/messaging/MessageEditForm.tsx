import React, { useState, useRef, useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface MessageEditFormProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export default function MessageEditForm({
  initialContent,
  onSave,
  onCancel
}: MessageEditFormProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus and select all text when edit form opens
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || content.trim() === initialContent.trim()) {
      onCancel();
      return;
    }

    setIsSaving(true);
    await onSave(content.trim());
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="w-full px-3 py-2 pr-20 bg-white border border-blue-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          rows={Math.min(content.split('\n').length + 1, 5)}
          maxLength={5000}
        />
        
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="submit"
            disabled={isSaving || !content.trim() || content.trim() === initialContent.trim()}
            className="p-1 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Save (Enter)"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="p-1 rounded bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
            title="Cancel (Esc)"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="mt-1 text-xs text-gray-500">
        Press Enter to save, Esc to cancel
      </div>
    </form>
  );
}
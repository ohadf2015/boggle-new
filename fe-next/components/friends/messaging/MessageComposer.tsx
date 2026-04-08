'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

const MESSAGE_MAX_LENGTH = 1000;
const TYPING_DEBOUNCE_MS = 2000;

/**
 * MessageComposer - Text input for sending messages
 *
 * Features:
 * - Character counter with visual feedback
 * - Send button (disabled if empty/over limit)
 * - Enter to send, Shift+Enter for newline
 * - Typing indicator emission (debounced)
 * - Auto-resize textarea
 */
export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  onTyping,
  disabled = false,
  placeholder,
  maxLength = MESSAGE_MAX_LENGTH,
  className,
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  /**
   * Auto-resize textarea based on content
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  /**
   * Emit typing indicator (debounced)
   */
  const emitTyping = useCallback((typing: boolean) => {
    if (!onTyping) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    if (typing && !isTypingRef.current) {
      onTyping(true);
      isTypingRef.current = true;

      // Auto-stop typing after debounce period
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
        isTypingRef.current = false;
      }, TYPING_DEBOUNCE_MS);
    }

    // Emit typing stop
    if (!typing && isTypingRef.current) {
      onTyping(false);
      isTypingRef.current = false;
    }
  }, [onTyping]);

  /**
   * Handle text change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;

    // Don't exceed max length
    if (newText.length <= maxLength) {
      setText(newText);

      // Emit typing indicator if text is being added
      if (newText.length > 0) {
        emitTyping(true);
      } else {
        emitTyping(false);
      }
    }
  }, [maxLength, emitTyping]);

  /**
   * Handle send
   */
  const handleSend = useCallback(() => {
    const trimmed = text.trim();

    if (trimmed && !disabled && trimmed.length <= maxLength) {
      onSend(trimmed);
      setText('');
      emitTyping(false);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [text, disabled, maxLength, onSend, emitTyping]);

  /**
   * Handle Enter key (Shift+Enter for newline)
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * Cleanup typing timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && onTyping) {
        onTyping(false);
      }
    };
  }, [onTyping]);

  const isValid = text.trim().length > 0 && text.length <= maxLength;
  const isOverLimit = text.length > maxLength;

  return (
    <div className={cn('p-3', className)}>
      <div className={cn(
        'flex gap-2 items-end p-3 rounded-neo border-2 border-neo-black',
        isDark ? 'bg-slate-700' : 'bg-white'
      )}>
        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('friends.typeMessage')}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent outline-hidden',
            'font-medium text-sm max-h-32 overflow-y-auto',
            isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            minHeight: '24px',
            lineHeight: '24px',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!isValid || disabled}
          className={cn(
            'shrink-0 p-2 rounded-neo border-2 border-neo-black',
            'transition-all',
            isValid && !disabled
              ? 'bg-neo-cyan shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5'
              : 'bg-gray-600 opacity-50 cursor-not-allowed'
          )}
          aria-label={t('friends.sendMessage')}
        >
          <Send className="w-4 h-4 text-neo-black" />
        </button>
      </div>

      {/* Character counter */}
      <div className="flex justify-end mt-1 px-1">
        <span className={cn(
          'text-xs font-medium',
          isOverLimit
            ? 'text-red-500'
            : text.length > maxLength * 0.9
            ? 'text-yellow-500'
            : isDark ? 'text-gray-500' : 'text-gray-400'
        )}>
          {t('friends.messageLimit', {
            current: text.length,
            max: maxLength,
          })}
        </span>
      </div>
    </div>
  );
};

export default MessageComposer;

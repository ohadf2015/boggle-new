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
   * Sync state from a raw value (shared by change/input/compositionEnd handlers).
   * Android GBoard in Hebrew buffers composition; onChange alone can leave React
   * state empty while the DOM value already has text.
   */
  const syncText = useCallback((raw: string) => {
    if (raw.length <= maxLength) {
      setText(raw);
      emitTyping(raw.length > 0);
    }
  }, [maxLength, emitTyping]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    syncText(e.target.value);
  }, [syncText]);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    syncText(e.currentTarget.value);
  }, [syncText]);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    syncText(e.currentTarget.value);
  }, [syncText]);

  /**
   * Handle composition update — fires per-keystroke DURING composition,
   * carrying the composing text. This keeps React text state in sync with the
   * DOM even when onChange doesn't fire (Android GBoard with Hebrew).
   */
  const handleCompositionUpdate = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    syncText(e.currentTarget.value);
  }, [syncText]);

  /**
   * Handle keyup — backstop to sync text when composition bypasses input events.
   */
  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    syncText(e.currentTarget.value);
  }, [syncText]);

  /**
   * Handle send — reads the DOM value directly because React state can be stale
   * mid-IME composition (Android GBoard with Hebrew doesn't always fire input
   * events until the word commits).
   */
  const handleSend = useCallback(() => {
    const raw = textareaRef.current?.value ?? text;
    const trimmed = raw.trim();

    if (trimmed && !disabled && trimmed.length <= maxLength) {
      onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.value = '';
        textareaRef.current.style.height = 'auto';
      }
      emitTyping(false);
    }
  }, [text, disabled, maxLength, onSend, emitTyping]);

  /**
   * Handle Enter key (Shift+Enter for newline)
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Skip only when the keydown is an IME composition commit (keyCode 229).
    // `isComposing` is unreliable on Android GBoard with Hebrew/RTL — it stays
    // true until a space/punctuation commits the word, blocking Enter-to-send.
    if (e.key === 'Enter' && !e.shiftKey && e.nativeEvent.keyCode !== 229) {
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
        isDark ? 'bg-neo-navy-elevated' : 'bg-white'
      )}>
        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onInput={handleInput}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('friends.typeMessage')}
          aria-label={t('friends.typeMessage')}
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

        {/* Send button — aria-disabled (not `disabled`) so clicks still commit
            IME composition on Android GBoard; handleSend reads the DOM value. */}
        <button
          type="button"
          onClick={handleSend}
          aria-disabled={!isValid || disabled}
          className={cn(
            'shrink-0 p-2 rounded-neo border-2 border-neo-black',
            'transition-all',
            isValid && !disabled
              ? 'bg-neo-cyan shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5'
              : 'bg-gray-600 opacity-50'
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

'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { couldBeOnBoard } from '@/utils/clientWordValidator';
import type { LetterGrid } from '@/types';
import type { Language } from '@/shared/types/game';
import type { HighlightedCell } from '@/components/GridComponent';
import { findWordPath } from '@/utils/wordPathFinder';

interface DesktopWordInputProps {
  grid: LetterGrid;
  language: Language;
  enabled: boolean;
  onWordSubmit: (word: string) => void;
  onHighlightChange?: (cells: HighlightedCell[]) => void;
  onTypingModeChange?: (isTyping: boolean) => void;
  minWordLength?: number;
  className?: string;
}

/**
 * DesktopWordInput — Visible auto-focused text input for desktop players.
 * Shows below the grid on md+ screens. Highlights matching grid path as user types.
 * Hidden on touch/mobile devices.
 */
const DesktopWordInput = memo<DesktopWordInputProps>(({
  grid,
  language,
  enabled,
  onWordSubmit,
  onHighlightChange,
  onTypingModeChange,
  minWordLength = 2,
  className,
}) => {
  const [typedWord, setTypedWord] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();
  const { t } = useLanguageSafe();

  const isValidOnGrid = typedWord.length > 0
    ? couldBeOnBoard(typedWord, grid, language)
    : true;

  const isSubmittable = typedWord.length >= minWordLength && isValidOnGrid;

  // Highlight grid path as user types
  useEffect(() => {
    if (!typedWord || typedWord.length === 0) {
      onHighlightChange?.([]);
      onTypingModeChange?.(false);
      return;
    }
    onTypingModeChange?.(true);
    const pathCells = findWordPath(typedWord, grid, language);
    const highlighted: HighlightedCell[] = pathCells
      ? pathCells.map(c => ({ row: c.row, col: c.col }))
      : [];
    onHighlightChange?.(highlighted);
    return undefined;
  }, [typedWord, grid, language, onHighlightChange, onTypingModeChange]);

  // Auto-focus on mount and when enabled changes
  useEffect(() => {
    if (enabled && isDesktop && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [enabled, isDesktop]);

  // Clear on grid change (new game)
  useEffect(() => {
    setTypedWord('');
    setHasSubmitted(false);
  }, [grid]);

  const handleSubmit = useCallback(() => {
    if (!isSubmittable) return;
    onWordSubmit(typedWord);
    setTypedWord('');
    setHasSubmitted(true);
    // Re-focus after submit
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [typedWord, isSubmittable, onWordSubmit]);

  const handleClear = useCallback(() => {
    setTypedWord('');
    onHighlightChange?.([]);
    onTypingModeChange?.(false);
    inputRef.current?.focus();
  }, [onHighlightChange, onTypingModeChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClear();
    }
  }, [handleSubmit, handleClear]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow letters
    const value = e.target.value.replace(/[^a-zA-Z\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u00C0-\u024F]/g, '');
    setTypedWord(value.toUpperCase());
  }, []);

  // Don't render on mobile/touch
  if (!isDesktop) return null;

  const showValidation = typedWord.length > 0;
  const isInvalid = showValidation && !isValidOnGrid;
  const isValid = showValidation && isValidOnGrid && typedWord.length >= minWordLength;

  return (
    <div className={cn('hidden md:flex justify-center mt-3', className)}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="relative w-full max-w-[400px]"
      >
        <div
          className={cn(
            'flex items-center gap-2 bg-neo-cream border-3 rounded-neo px-3 py-2 shadow-hard-sm transition-colors duration-200',
            isInvalid && 'border-red-500 shadow-[4px_4px_0px_rgba(239,68,68,0.5)]',
            isValid && 'border-neo-lime shadow-[4px_4px_0px_rgba(191,255,0,0.5)]',
            !showValidation && 'border-neo-black/60',
            !enabled && 'opacity-50 pointer-events-none',
          )}
        >
          {/* Keyboard icon */}
          <Keyboard
            className={cn(
              'w-4 h-4 shrink-0 transition-colors',
              isValid ? 'text-green-600' : isInvalid ? 'text-red-500' : 'text-neo-black/40',
            )}
          />

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={typedWord}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={!enabled}
            placeholder={t('desktopInput.placeholder') || 'Type a word...'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label={t('desktopInput.ariaLabel') || 'Type a word to submit'}
            className={cn(
              'flex-1 bg-transparent outline-none font-black text-lg uppercase tracking-wider',
              'text-neo-black placeholder:text-neo-black/30 placeholder:font-bold placeholder:text-sm placeholder:normal-case placeholder:tracking-normal',
              'caret-neo-cyan',
            )}
          />

          {/* Clear button */}
          <AnimatePresence>
            {typedWord.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                onClick={handleClear}
                className="p-1 rounded-neo hover:bg-neo-black/10 transition-colors"
                aria-label={t('common.clear') || 'Clear'}
                type="button"
              >
                <X className="w-4 h-4 text-neo-black/50" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!isSubmittable}
            whileTap={isSubmittable ? { scale: 0.9 } : undefined}
            className={cn(
              'p-1.5 rounded-neo border-2 transition-all duration-150',
              isSubmittable
                ? 'bg-neo-lime border-neo-black text-neo-black shadow-hard-pressed hover:shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer'
                : 'bg-neo-black/10 border-neo-black/20 text-neo-black/30 cursor-not-allowed',
            )}
            aria-label={t('desktopInput.submit') || 'Submit word'}
            type="button"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>

        {/* First-time hint */}
        <AnimatePresence>
          {!hasSubmitted && typedWord.length === 0 && enabled && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-neo-white/50 text-center mt-1 font-bold"
            >
              {t('desktopInput.hint') || 'Type letters to find words · Enter to submit · Esc to clear'}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

DesktopWordInput.displayName = 'DesktopWordInput';

export default DesktopWordInput;

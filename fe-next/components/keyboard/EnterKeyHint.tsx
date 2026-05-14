'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'lexiclash_enter_hint_shown_count';
const MAX_SHOW_COUNT = 5;

interface EnterKeyHintProps {
  /** Whether the hint should be visible (user is typing with enough chars) */
  isVisible: boolean;
  /** Translation function */
  t: (key: string) => string;
  /** Called when user successfully submits (to track and potentially stop showing) */
  onSubmitSuccess?: () => void;
  /** Position on screen */
  position?: 'center' | 'bottom-center';
  /** Additional class names */
  className?: string;
}

/**
 * EnterKeyHint - Pulsing Enter key badge for first-time users
 *
 * Shows a pulsing Enter key indicator when the user is typing a word
 * that's long enough to submit. After a few successful submissions
 * (tracked via localStorage), the hint stops appearing.
 * Neo-Brutalist design with animation.
 */
export function EnterKeyHint({
  isVisible,
  t,
  onSubmitSuccess,
  position = 'bottom-center',
  className,
}: EnterKeyHintProps) {
  const [showCount, setShowCount] = useState<number | null>(null);
  const [shouldShow, setShouldShow] = useState(false);

  // Load show count from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const count = stored ? parseInt(stored, 10) : 0;
    setShowCount(count);
    setShouldShow(count < MAX_SHOW_COUNT);
  }, []);

  // Track when hint is shown
  useEffect(() => {
    if (isVisible && shouldShow && showCount !== null) {
      const newCount = showCount + 1;
      setShowCount(newCount);
      localStorage.setItem(STORAGE_KEY, String(newCount));

      if (newCount >= MAX_SHOW_COUNT) {
        setShouldShow(false);
      }
    }
  }, [isVisible, shouldShow, showCount]);

  // Handle successful submission
  const handleSubmitSuccess = useCallback(() => {
    onSubmitSuccess?.();
  }, [onSubmitSuccess]);

  // Expose handleSubmitSuccess for parent components to call
  useEffect(() => {
    (EnterKeyHint as { handleSubmitSuccess?: () => void }).handleSubmitSuccess = handleSubmitSuccess;
  }, [handleSubmitSuccess]);

  // Position classes
  const positionClasses = {
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'bottom-center': 'bottom-24 left-1/2 -translate-x-1/2',
  };

  if (!shouldShow || showCount === null) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'fixed z-50 pointer-events-none',
            positionClasses[position],
            className
          )}
          role="status"
          aria-live="polite"
        >
          <m.div
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                '4px 4px 0px #000',
                '6px 6px 0px #000',
                '4px 4px 0px #000',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5',
              'rounded-neo border-3 border-neo-black',
              'bg-neo-lime text-neo-black',
              'shadow-hard'
            )}
          >
            <span className="text-sm font-bold">
              {t('enterKeyHint.pressEnter')}
            </span>
            <kbd
              className={cn(
                'px-2 py-1 min-w-[50px] text-center',
                'bg-neo-black text-neo-lime',
                'rounded border-2 border-neo-black',
                'font-mono font-bold text-sm',
                'shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]'
              )}
            >
              Enter
            </kbd>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage Enter key hint state
 * Returns whether hint should show and a function to dismiss it
 */
export function useEnterKeyHint() {
  const [showCount, setShowCount] = useState<number>(0);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const count = stored ? parseInt(stored, 10) : 0;
    setShowCount(count);
    setShouldShow(count < MAX_SHOW_COUNT);
  }, []);

  const incrementShowCount = useCallback(() => {
    if (showCount < MAX_SHOW_COUNT) {
      const newCount = showCount + 1;
      setShowCount(newCount);
      localStorage.setItem(STORAGE_KEY, String(newCount));
      if (newCount >= MAX_SHOW_COUNT) {
        setShouldShow(false);
      }
    }
  }, [showCount]);

  const dismissPermanently = useCallback(() => {
    setShowCount(MAX_SHOW_COUNT);
    setShouldShow(false);
    localStorage.setItem(STORAGE_KEY, String(MAX_SHOW_COUNT));
  }, []);

  return {
    shouldShowEnterHint: shouldShow,
    incrementShowCount,
    dismissPermanently,
    remainingShows: Math.max(0, MAX_SHOW_COUNT - showCount),
  };
}

export default EnterKeyHint;

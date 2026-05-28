'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardInlineHintProps {
  /** Translation function */
  t: (key: string) => string;
  /** Whether the game is active (grid is interactive) */
  isActive?: boolean;
  /** Additional class names */
  className?: string;
}

const STORAGE_KEY = 'keyboardInlineHintDismissed';
const SHOW_DELAY_MS = 3000; // Show after 3 seconds of gameplay

/**
 * KeyboardInlineHint - Subtle inline hint below grid showing keyboard is available
 *
 * Appears after a short delay during gameplay to inform desktop users they can
 * type words directly. Fades out after interaction or can be clicked to dismiss.
 * Once dismissed, never shows again.
 *
 * Design: Minimal, inline with game UI, uses neo-brutalist styling.
 */
export function KeyboardInlineHint({
  t,
  isActive = true,
  className,
}: KeyboardInlineHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(true);

  // Desktop detection - only show on non-mobile devices
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  // Dismiss handler - memoized with useCallback
  const handleDismiss = React.useCallback(() => {
    setIsVisible(false);
    setHasDismissed(true);

    // Remember dismissal
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  }, []);

  // Check localStorage and set up delayed show
  useEffect(() => {
    if (!isDesktop || !isActive) return;

    // Check if user has already dismissed this hint
    const dismissed = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY) === 'true'
      : true;

    if (dismissed) {
      setHasDismissed(true);
      return;
    }

    setHasDismissed(false);

    // Show hint after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    // Auto-hide after 10 seconds
    const autoHideTimer = setTimeout(() => {
      setIsVisible(false);
    }, SHOW_DELAY_MS + 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHideTimer);
    };
  }, [isDesktop, isActive]);

  // Handle keyboard input - hide hint when user starts typing
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hide when user types a letter (they discovered keyboard input!)
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleDismiss]);

  // Don't render on mobile or if dismissed
  if (!isDesktop || hasDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <m.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={handleDismiss}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5',
            'bg-neo-navy/80',
            'text-neo-white hover:text-neo-white',
            'border-2 border-neo-cream/20 hover:border-neo-cyan/50',
            'rounded-neo',
            'text-xs font-medium',
            'transition-colors cursor-pointer',
            'group',
            className
          )}
          aria-label={t('keyboardInlineHint.fullMessage')}
        >
          {/* Keyboard icon with subtle animation */}
          <m.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-neo-cyan group-hover:text-neo-lime transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </m.div>

          {/* Text */}
          <span>
            {t('keyboardInlineHint.message')}
          </span>

          {/* Keyboard visualization */}
          <span className="text-neo-white group-hover:text-neo-white transition-colors">
            ⌨️
          </span>
        </m.button>
      )}
    </AnimatePresence>
  );
}

export default KeyboardInlineHint;

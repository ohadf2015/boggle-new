'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardHintTooltipProps {
  /** Show the hint after this many seconds of gameplay */
  delaySeconds?: number;
  /** Only show on desktop/tablet */
  desktopOnly?: boolean;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * KeyboardHintTooltip - Discoverable hint for keyboard word input
 *
 * Shows after delaySeconds to inform users they can type words instead of swiping
 * Uses localStorage to only show once per user
 */
export function KeyboardHintTooltip({
  delaySeconds = 10,
  desktopOnly = true,
  t,
}: KeyboardHintTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed this hint
    const hasSeenHint = typeof window !== 'undefined'
      ? localStorage.getItem('keyboardHintDismissed') === 'true'
      : false;

    if (hasSeenHint) {
      return;
    }

    // Check if desktop only mode
    if (desktopOnly) {
      const isMobile = typeof window !== 'undefined'
        ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        : false;

      if (isMobile) {
        return;
      }
    }

    // Show hint after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [delaySeconds, desktopOnly]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);

    // Remember dismissal
    if (typeof window !== 'undefined') {
      localStorage.setItem('keyboardHintDismissed', 'true');
    }
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'fixed bottom-20 right-4 z-50',
            'max-w-[280px] sm:max-w-[320px]',
            'bg-neo-purple text-white',
            'border-4 border-neo-black',
            'rounded-neo-lg shadow-hard-xl',
            'p-4'
          )}
          role="tooltip"
          aria-live="polite"
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-neo border-2 border-white/30 transition-colors"
            aria-label="Dismiss hint"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-3 pr-6">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center">
              <Keyboard className="w-6 h-6" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm uppercase mb-1">
                💡 {t('keyboardHint.title') || 'Pro Tip'}
              </div>
              <p className="text-sm leading-snug mb-3">
                {t('keyboardHint.message') || 'You can type words on your keyboard! Just start typing and press Enter to submit.'}
              </p>

              {/* Keyboard shortcuts */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <kbd className="px-2 py-1 bg-neo-black/30 rounded border border-white/20 font-mono">
                  {t('keyboardHint.type') || 'Type'}
                </kbd>
                <span className="text-white/70">+</span>
                <kbd className="px-2 py-1 bg-neo-black/30 rounded border border-white/20 font-mono">
                  Enter
                </kbd>
                <span className="text-white/70 mx-1">·</span>
                <kbd className="px-2 py-1 bg-neo-black/30 rounded border border-white/20 font-mono">
                  Esc
                </kbd>
                <span className="text-xs text-white/70">
                  {t('keyboardHint.clear') || 'to clear'}
                </span>
              </div>
            </div>
          </div>

          {/* Got it button */}
          <button
            onClick={handleDismiss}
            className={cn(
              'w-full mt-3 px-4 py-2',
              'bg-neo-yellow text-neo-black',
              'border-3 border-neo-black rounded-neo',
              'font-bold text-sm uppercase',
              'shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg',
              'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
              'transition-all'
            )}
          >
            {t('keyboardHint.gotIt') || 'Got it!'}
          </button>

          {/* Pointer arrow */}
          <div className="absolute bottom-[-12px] right-8 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-neo-black" />
          <div className="absolute bottom-[-8px] right-[34px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-neo-purple" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default KeyboardHintTooltip;

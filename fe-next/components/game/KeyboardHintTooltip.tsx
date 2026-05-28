'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Auto-close the tooltip this many ms after it appears */
const AUTO_CLOSE_MS = 5000;

interface KeyboardHintTooltipProps {
  /** Show the hint after this many seconds of gameplay */
  delaySeconds?: number;
  /** Only show on desktop/tablet */
  desktopOnly?: boolean;
  /** Suppress entirely (e.g. during round-start countdown) */
  suppressed?: boolean;
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
  suppressed = false,
  t,
}: KeyboardHintTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (suppressed) return;
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

    // Show hint after delay, then auto-close after AUTO_CLOSE_MS
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      closeTimer = setTimeout(() => {
        setIsVisible(false);
        setIsDismissed(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('keyboardHintDismissed', 'true');
        }
      }, AUTO_CLOSE_MS);
    }, delaySeconds * 1000);

    return () => {
      clearTimeout(showTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [delaySeconds, desktopOnly, suppressed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);

    // Remember dismissal
    if (typeof window !== 'undefined') {
      localStorage.setItem('keyboardHintDismissed', 'true');
    }
  };

  // Don't render if dismissed or suppressed
  if (isDismissed || suppressed) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0, x: -20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className={cn(
            'fixed bottom-28 left-3 z-40',
            'w-[240px]',
            'bg-neo-pink/95 backdrop-blur-xs text-white',
            'border-3 border-neo-black',
            'rounded-neo-lg shadow-hard-lg',
            'p-3'
          )}
          role="tooltip"
          aria-live="polite"
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full border-2 border-white/30 transition-colors"
            aria-label="Dismiss hint"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-2">
            {/* Icon with pulse animation */}
            <m.div
              className="shrink-0 w-7 h-7 bg-neo-lime text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Keyboard className="w-4 h-4" />
            </m.div>

            {/* Text */}
            <div className="flex-1 min-w-0 pe-2">
              <div className="font-black text-xs uppercase mb-0.5">
                {t('keyboardHint.title')}
              </div>
              <p className="text-[11px] leading-snug mb-2">
                {t('keyboardHint.message')}
              </p>

              {/* Keyboard shortcuts with animation */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                <m.kbd
                  className="px-1.5 py-0.5 bg-neo-black/30 rounded border border-white/20 font-mono"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                >
                  Type
                </m.kbd>
                <span className="text-white">→</span>
                <m.kbd
                  className="px-1.5 py-0.5 bg-neo-black/30 rounded border border-white/20 font-mono"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                >
                  Enter
                </m.kbd>
              </div>
            </div>
          </div>

          {/* Compact dismiss button */}
          <button
            onClick={handleDismiss}
            className={cn(
              'w-full mt-2 px-3 py-1.5',
              'bg-neo-lime text-neo-black',
              'border-2 border-neo-black rounded-neo',
              'font-bold text-[11px] uppercase',
              'shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard',
              'active:translate-x-px active:translate-y-px active:shadow-none',
              'transition-all'
            )}
          >
            {t('keyboardHint.gotIt')}
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default KeyboardHintTooltip;

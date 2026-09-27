'use client';

import { m, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardQuickTipProps {
  /** Whether to show the quick tip */
  isVisible: boolean;
  /** Callback to dismiss the quick tip */
  onDismiss: () => void;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * KeyboardQuickTip - First-time keyboard hint
 *
 * Shows immediately on first gameplay to inform users about keyboard support.
 * Minimal top banner design with quick auto-dismiss.
 * Once dismissed, never shows again (persisted in localStorage).
 */
export function KeyboardQuickTip({
  isVisible,
  onDismiss,
  t,
}: KeyboardQuickTipProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.5 }}
          className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-50',
            'max-w-[90%] sm:max-w-md',
            'bg-neo-pink/95 backdrop-blur-xs text-white',
            'border-3 border-neo-black',
            'rounded-neo shadow-hard-lg',
            'px-3 py-2'
          )}
          role="tooltip"
          aria-live="polite"
        >
          {/* Compact single-line content */}
          <div className="flex items-center gap-2">
            {/* Icon with glow pulse */}
            <m.div
              className="shrink-0 w-7 h-7 bg-neo-lime text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center relative"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Keyboard className="w-4 h-4" />
              {/* Glow effect */}
              <m.div
                className="absolute inset-0 w-7 h-7 bg-neo-lime rounded-neo blur-xs -z-10"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </m.div>

            {/* Text - single line, compact */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight">
                {t('keyboardQuickTip.message')}
              </p>
            </div>

            {/* Close button - inline */}
            <button type="button"
              onClick={onDismiss}
              className="shrink-0 w-6 h-6 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full border-2 border-white/30 transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default KeyboardQuickTip;

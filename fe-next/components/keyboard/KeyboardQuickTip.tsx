'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
 * Once dismissed, never shows again (persisted in localStorage).
 * Neo-Brutalist design matching KeyboardHintTooltip.
 */
export function KeyboardQuickTip({
  isVisible,
  onDismiss,
  t,
}: KeyboardQuickTipProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.5 }}
          className={cn(
            'fixed bottom-20 right-4 z-50',
            'max-w-[260px]',
            'bg-neo-pink text-white',
            'border-4 border-neo-black',
            'rounded-neo-lg shadow-hard-xl',
            'p-4'
          )}
          role="tooltip"
          aria-live="polite"
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            className={cn(
              'absolute top-2 right-2',
              'w-8 h-8 min-w-[32px] min-h-[32px]',
              'flex items-center justify-center',
              'bg-white/20 hover:bg-white/30',
              'rounded-neo border-2 border-white/30',
              'transition-colors'
            )}
            aria-label="Dismiss tip"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-3 pr-6">
            {/* Icon */}
            <div className="flex-shrink-0 w-9 h-9 bg-neo-lime text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center">
              <Keyboard className="w-5 h-5" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm uppercase mb-1">
                {t('keyboardQuickTip.title')}
              </div>
              <p className="text-sm leading-snug mb-2">
                {t('keyboardQuickTip.message')}
              </p>
              <p className="text-xs text-white/70">
                {t('keyboardQuickTip.pressQuestion')}
              </p>
            </div>
          </div>

          {/* Got it button */}
          <button
            onClick={onDismiss}
            className={cn(
              'w-full mt-3 px-4 py-2',
              'bg-neo-lime text-neo-black',
              'border-3 border-neo-black rounded-neo',
              'font-bold text-sm uppercase',
              'shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg',
              'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
              'transition-all'
            )}
          >
            {t('keyboardQuickTip.gotIt')}
          </button>

          {/* Pointer arrow */}
          <div className="absolute bottom-[-12px] right-8 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-neo-black" />
          <div className="absolute bottom-[-8px] right-[34px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-neo-pink" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default KeyboardQuickTip;

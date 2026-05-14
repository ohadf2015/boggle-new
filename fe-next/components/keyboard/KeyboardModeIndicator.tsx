'use client';

import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardModeIndicatorProps {
  /** Whether keyboard navigation mode is active */
  isNavigationMode: boolean;
  /** Whether keyboard typing mode is active */
  isTypingMode: boolean;
  /** Translation function */
  t: (key: string) => string;
  /** Auto-hide delay in ms (0 = never auto-hide) */
  autoHideDelay?: number;
  /** Position on screen */
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

/**
 * KeyboardModeIndicator - Shows when keyboard mode is active
 *
 * Displays a small badge indicating navigation or typing mode.
 * Auto-hides after inactivity unless currently typing.
 * Neo-Brutalist design.
 */
export function KeyboardModeIndicator({
  isNavigationMode,
  isTypingMode,
  t,
  autoHideDelay = 3000,
  position = 'top-right',
}: KeyboardModeIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(() => Date.now());

  const isActive = isNavigationMode || isTypingMode;
  const mode = isTypingMode ? 'typing' : 'navigation';

  // Show indicator when mode becomes active
  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      setLastActivity(Date.now());
    }
  }, [isActive, isNavigationMode, isTypingMode]);

  // Auto-hide after inactivity (but not during active typing)
  useEffect(() => {
    if (!isActive || autoHideDelay === 0) {
      if (!isActive) {
        setIsVisible(false);
      }
      return;
    }

    // Don't auto-hide during active typing
    if (isTypingMode) {
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [isActive, isTypingMode, lastActivity, autoHideDelay]);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-20 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-20 left-4',
  };

  return (
    <AnimatePresence>
      {isVisible && isActive && (
        <m.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'fixed z-50 pointer-events-none',
            'short:hidden',
            positionClasses[position]
          )}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2',
              'rounded-neo border-3 border-neo-black',
              'shadow-hard',
              // Different colors for different modes
              mode === 'typing'
                ? 'bg-neo-pink text-white'
                : 'bg-neo-cyan text-neo-black'
            )}
          >
            <Keyboard className="w-4 h-4" />
            <div>
              <div className="font-black text-xs uppercase">
                {mode === 'typing'
                  ? t('keyboardMode.typing')
                  : t('keyboardMode.navigation')}
              </div>
              <div className="text-[10px] font-bold opacity-80">
                {mode === 'typing'
                  ? t('keyboardMode.typingHint')
                  : t('keyboardMode.navigationHint')}
              </div>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default KeyboardModeIndicator;

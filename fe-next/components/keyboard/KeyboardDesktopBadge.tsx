'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardDesktopBadgeProps {
  /** Translation function */
  t: (key: string) => string;
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Additional class names */
  className?: string;
}

/**
 * KeyboardDesktopBadge - Persistent indicator showing keyboard is available
 *
 * Shows a subtle badge on desktop devices indicating that keyboard input
 * is supported. Only renders on non-mobile devices.
 * Neo-Brutalist design with cyan background.
 */
export function KeyboardDesktopBadge({
  t,
  position = 'bottom-right',
  className,
}: KeyboardDesktopBadgeProps) {
  // Desktop detection - only show on non-mobile devices
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  if (!isDesktop) {
    return null;
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className={cn(
        'fixed z-40 pointer-events-none',
        positionClasses[position],
        className
      )}
      role="status"
      aria-label={t('keyboardDesktopBadge.typeWords')}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          'rounded-neo border-2 border-neo-black',
          'bg-neo-cyan/90 text-neo-black',
          'shadow-hard-sm',
        )}
      >
        <Keyboard className="w-4 h-4" />
        <div className="flex flex-col">
          <span className="text-xs font-bold leading-tight">
            {t('keyboardDesktopBadge.typeWords')}
          </span>
          <span className="text-[10px] opacity-70 leading-tight">
            {t('keyboardDesktopBadge.pressQuestion')}
          </span>
        </div>
      </div>
    </m.div>
  );
}

export default KeyboardDesktopBadge;

'use client';

import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GiftNotificationBadgeProps {
  count: number;
  className?: string;
}

/**
 * GiftNotificationBadge - Animated badge showing unclaimed gift count
 *
 * Features:
 * - Pulse animation when count > 0
 * - Scale entrance animation
 * - Neo-Brutalist styling with hard shadows
 */
export function GiftNotificationBadge({ count, className }: GiftNotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className={cn(
          'absolute -top-1 -inset-e-1 z-10',
          'min-w-[18px] h-[18px] px-1',
          'flex items-center justify-center',
          'bg-neo-pink text-white text-xs font-bold',
          'rounded-full border-2 border-neo-black',
          'shadow-[2px_2px_0px_black]',
          className
        )}
      >
        <m.span
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {count > 99 ? '99+' : count}
        </m.span>
      </m.div>
    </AnimatePresence>
  );
}

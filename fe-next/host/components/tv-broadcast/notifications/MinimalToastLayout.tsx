'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface MinimalToastLayoutProps {
  headline: string;
  player?: string;
  icon: LucideIcon;
  bgGradient: string;
  textColor: string;
  borderColor: string;
  /** Classroom header slot: wrap long names instead of cutting them, sized for the back row. */
  wrap?: boolean;
}

/**
 * MinimalToastLayout - Small, compact notification for subtle events
 * Used for word snipes, combo breaks - no mascot to keep minimal
 */
const MinimalToastLayout = memo<MinimalToastLayoutProps>(({
  headline,
  player,
  icon: Icon,
  bgGradient,
  textColor,
  borderColor,
  wrap = false,
}) => {
  if (wrap) {
    return (
      <m.div
        initial={{ y: 20, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn('max-w-full px-2 py-1 md:px-4 md:py-2 rounded-neo border-3 shadow-hard', `bg-linear-to-r ${bgGradient}`, textColor, borderColor)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="size-4 md:size-6 shrink-0" aria-hidden />
          <p className="min-w-0 leading-tight [overflow-wrap:break-word]">
            {player && <bdi className="font-black text-sm md:text-lg lg:text-2xl">{player}</bdi>}
            {player && ' '}
            <span className="font-bold text-xs md:text-base lg:text-xl">{headline}</span>
          </p>
        </div>
      </m.div>
    );
  }
  return (
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'max-w-full px-5 py-3 rounded-neo border-3',
        `bg-linear-to-r ${bgGradient}`,
        textColor,
        borderColor,
        'shadow-hard',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="w-5 h-5 shrink-0" />
        <div className="flex min-w-0 items-center gap-2">
          {player && (
            <span className="truncate font-black text-base">{player}</span>
          )}
          <span className="truncate font-bold text-sm opacity-80">{headline}</span>
        </div>
      </div>
    </m.div>
  );
});

MinimalToastLayout.displayName = 'MinimalToastLayout';

export default MinimalToastLayout;

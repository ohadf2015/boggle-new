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
}) => {
  return (
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'px-5 py-3 rounded-neo border-3',
        `bg-linear-to-r ${bgGradient}`,
        textColor,
        borderColor,
        'shadow-hard',
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 shrink-0" />
        <div className="flex items-center gap-2">
          {player && (
            <span className="font-black text-base">{player}</span>
          )}
          <span className="font-bold text-sm opacity-80">{headline}</span>
        </div>
      </div>
    </m.div>
  );
});

MinimalToastLayout.displayName = 'MinimalToastLayout';

export default MinimalToastLayout;

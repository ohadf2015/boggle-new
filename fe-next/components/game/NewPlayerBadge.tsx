'use client';

/**
 * NewPlayerBadge - Visual indicator for new players
 *
 * Shows a small "NEW" badge next to player names to help
 * identify newcomers in the waiting room and leaderboards.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewPlayerBadgeProps {
  /** Translation function */
  t?: (key: string) => string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
  /** Additional class names */
  className?: string;
  /** Whether to animate */
  animate?: boolean;
}

/**
 * A small badge indicating a new player
 */
export const NewPlayerBadge = memo<NewPlayerBadgeProps>(({
  t,
  size = 'sm',
  className,
  animate = true,
}) => {
  const sizeClasses = {
    xs: 'text-[8px] px-1 py-0.5 gap-0.5',
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
  };

  const iconSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
  };

  const content = (
    <span
      className={cn(
        'inline-flex items-center font-black uppercase tracking-wider',
        'bg-neo-pink text-neo-black rounded border border-neo-black/50',
        sizeClasses[size],
        className
      )}
    >
      <Sparkles className={iconSizes[size]} />
      {t?.('player.new') || 'NEW'}
    </span>
  );

  if (animate) {
    return (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {content}
      </motion.span>
    );
  }

  return content;
});

NewPlayerBadge.displayName = 'NewPlayerBadge';

export default NewPlayerBadge;

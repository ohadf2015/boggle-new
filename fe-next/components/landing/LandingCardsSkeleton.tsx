'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ModeCardSkeleton } from './ModeCardSkeleton';

interface LandingCardsSkeletonProps {
  /** Whether showing in compact/landscape mode */
  compact?: boolean;
  /** Additional className */
  className?: string;
  /** Whether the user is an admin */
  isAdmin?: boolean;
}

/**
 * LandingCardsSkeleton - Loading skeleton for the entire landing page cards section
 * Matches the exact layout of the final cards (Daily Banner + 4 Mode Cards)
 */
export const LandingCardsSkeleton: React.FC<LandingCardsSkeletonProps> = ({
  compact = false,
  className,
}) => {
  return (
    <div
      data-testid="landing-cards-skeleton"
      aria-hidden="true"
      className={cn(
        'w-full',
        compact ? 'space-y-4' : 'max-w-4xl mx-auto',
        className
      )}
    >
      {/* Daily Challenge Banner Skeleton */}
      <div
        className={cn(
          // Simplified: solid color instead of gradient, no animate-pulse
          'w-full rounded-neo border-3 border-neo-black shadow-hard-lg bg-neo-yellow',
          compact ? 'p-2 sm:p-3 mb-4' : 'p-3 sm:p-4 col-span-1 sm:col-span-2 mb-3 sm:mb-4 lg:mb-5'
        )}
        style={{ minHeight: compact ? '60px' : '72px' }}
      >
        <div className={cn('flex items-center', compact ? 'gap-3 sm:gap-4' : 'gap-3 sm:gap-4')}>
          <div
            className={cn(
              'rounded-neo bg-neo-navy shrink-0',
              compact ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'
            )}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className={cn('bg-neo-black/15 rounded', compact ? 'h-5 w-36' : 'h-6 w-40')} />
            <div className={cn('bg-neo-black/10 rounded', compact ? 'h-3 w-24' : 'h-4 w-28')} />
          </div>
        </div>
      </div>

      {/* Mode Cards Grid Skeleton */}
      <div
        className={cn(
          'grid gap-3 sm:gap-4 lg:gap-5',
          compact ? 'grid-cols-2 gap-2 sm:gap-3' : 'grid-cols-1 sm:grid-cols-2'
        )}
      >
        {/* Primary cards - Multiplayer and Single Player */}
        <ModeCardSkeleton variant="pink" />
        <ModeCardSkeleton variant="cyan" />

        {/* Secondary cards - Adventure and Brain Training */}
        <ModeCardSkeleton variant="lime" secondary />
        <ModeCardSkeleton variant="purple" secondary />
      </div>
    </div>
  );
};

export default LandingCardsSkeleton;

'use client';

import { memo } from 'react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { cn } from '@/lib/utils';

export interface MpScoreGain {
  /** Unique per accepted word (e.g. `useMpLastWord().id`) — re-triggers the bump. */
  id: string;
  points: number;
}

export interface MpScoreChipProps {
  /** The server's score. Never a client-computed number (pitfall class 3). */
  value: number;
  gain?: MpScoreGain | null;
  size: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Score chip with a rolling counter. A new `gain.id` re-keys the bump wrapper
 * so the scale keyframe (1 → 1.15 → 1, 180ms, transform only) runs once.
 */
function MpScoreChipImpl({ value, gain, size, className }: MpScoreChipProps) {
  const showGain = !!gain && gain.points > 0;
  return (
    <div
      data-testid="mp-score-chip"
      data-bump={gain?.id ?? ''}
      className={cn(
        'relative inline-flex items-center rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black shadow-hard-sm font-neo-display font-bold tabular-nums',
        size === 'sm' ? 'px-2 h-8 text-base' : size === 'md' ? 'px-3 h-10 text-xl' : 'px-4 h-[calc(56px*var(--mp-u,1))] text-3xl',
        className,
      )}
    >
      <span key={gain?.id ?? 'idle'} className={cn('inline-block', gain?.id && 'animate-mp-bump')}>
        <AnimatedCounter value={value} size={size === 'lg' ? 'xl' : size === 'md' ? 'lg' : 'md'} className="text-neo-black" />
      </span>
      {showGain && (
        <span
          key={`g-${gain!.id}`}
          data-testid="mp-score-gain"
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 end-0 text-sm text-neo-lime animate-mp-float"
        >
          +{gain!.points}
        </span>
      )}
    </div>
  );
}

export const MpScoreChip = memo(MpScoreChipImpl);
MpScoreChip.displayName = 'MpScoreChip';

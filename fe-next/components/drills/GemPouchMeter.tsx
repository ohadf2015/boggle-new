'use client';

import { Gem, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GemPouchMeterProps {
  /** Rare/legendary gems found — the goal metric. */
  rareCount: number;
  target: number;
  /** rareCount / target, clamped to [0, 1]. */
  fraction: number;
  /** Every gem in the haul (all words found). */
  totalGems: number;
  t: (key: string) => string;
}

/**
 * Gem Pouch meter — the "felt progress" surface for Rare Gems.
 *
 * Replaces the old tiny `3/3` chip with a chunky neo-brutalist fill bar so
 * the player *sees* the pouch fill as they hunt. Purely presentational;
 * progress math lives in `lib/drills/rareGems.ts`.
 */
export default function GemPouchMeter({
  rareCount,
  target,
  fraction,
  totalGems,
  t,
}: GemPouchMeterProps) {
  const full = fraction >= 1;
  const pct = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Pouch fill bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-neo-white">
            <Gem className="w-3.5 h-3.5 text-neo-purple" />
            {t('brain.drills.gemPouch')}
          </span>
          <span className="text-xs font-black tabular-nums text-neo-white">
            {rareCount}/{target}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t('brain.drills.gemPouch')}
          aria-valuenow={rareCount}
          aria-valuemin={0}
          aria-valuemax={target}
          data-full={full ? 'true' : 'false'}
          className={cn(
            'relative h-4 w-full rounded-neo border-2 border-neo-black overflow-hidden',
            'bg-neo-navy',
          )}
        >
          <div
            data-testid="gem-pouch-fill"
            style={{ width: pct }}
            className={cn(
              'h-full transition-[width] duration-300 ease-out',
              full
                ? 'bg-neo-cozy motion-safe:animate-pulse'
                : 'bg-neo-purple',
            )}
          />
          {full && (
            <Sparkles className="absolute inset-y-0 right-1 my-auto w-3.5 h-3.5 text-neo-black" />
          )}
        </div>
      </div>

      {/* Whole-haul gem count — common finds are gems too */}
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded border-2 border-neo-black shrink-0',
          'bg-neo-navy-elevated',
        )}
        title={t('brain.drills.gemsCollected')}
      >
        <Gem className="w-4 h-4 text-neo-cyan" />
        <span
          data-testid="gem-haul-count"
          className="font-black text-sm tabular-nums text-neo-white"
        >
          {totalGems}
        </span>
      </div>
    </div>
  );
}

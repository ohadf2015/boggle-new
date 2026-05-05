'use client';

/**
 * BlastTileTypeBreakdown — horizontal pill row on the results screen showing
 * how many of each special-tile type the player cleared this run. The leader
 * (highest count) gets a lime ring + drop-shadow so the player's "best at"
 * tile is the first thing the eye lands on.
 *
 * Skips:
 *  - 'standard' (uninteresting, would dominate any sane run)
 *  - any type with 0 clears (sparse data, less noise)
 *
 * Why a per-type icon emoji instead of lucide-react: each blast tile already
 * uses an emoji visual identity in the tile guide. Mirroring that here keeps
 * the player's mental model intact (what looked like a 💎 in the grid still
 * looks like a 💎 here).
 */

import { cn } from '@/lib/utils';
import type { BlastTileType } from './types';

/** Display order — frequent visible types first. Cleared types not in this
 *  list won't render. Keeps the row compact + curated. */
const DISPLAY_ORDER: BlastTileType[] = [
  'bomb', 'gold', 'rainbow', 'ice', 'lightning',
  'prism', 'gem', 'frozen', 'diamond',
];

const ICON: Partial<Record<BlastTileType, string>> = {
  bomb: '💣', gold: '🪙', rainbow: '🌈', ice: '🧊',
  lightning: '⚡', prism: '🔷', gem: '💎', frozen: '❄️',
  diamond: '💠', magnet: '🧲', countdown: '⏱️', portal: '🌀',
  catalyst: '🧪', shuffle: '🔀', magma: '🌋', crystal: '🔮',
  fuse: '🧨', locked: '🔒', key: '🗝️', anchor: '⚓',
};

interface BlastTileTypeBreakdownProps {
  /** Sparse map of {tileType: count}. Standard + zero-count entries dropped. */
  tileTypeClears?: Partial<Record<BlastTileType, number>>;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function BlastTileTypeBreakdown({ tileTypeClears, t }: BlastTileTypeBreakdownProps) {
  if (!tileTypeClears) return null;

  // Build display list: filter zero/standard, sort by DISPLAY_ORDER, then count desc.
  const entries = DISPLAY_ORDER
    .map(type => ({ type, count: tileTypeClears[type] ?? 0 }))
    .filter(e => e.count > 0);

  if (entries.length === 0) return null;

  // Find leader for highlight
  const leaderCount = Math.max(...entries.map(e => e.count));

  return (
    <div className="w-full" data-testid="blast-results-tile-types">
      <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-2 px-1">
        {t('blast.tileBreakdown') || 'Tile Breakdown'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(({ type, count }) => {
          const isLeader = count === leaderCount && entries.length > 1;
          return (
            <div
              key={type}
              data-testid={`blast-tile-pill-${type}`}
              data-leader={isLeader ? 'true' : 'false'}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5',
                'rounded-neo border-2 border-neo-black shadow-hard-sm',
                'font-neo-display font-black text-[11px] tabular-nums',
                isLeader
                  ? 'bg-neo-lime text-neo-black shadow-hard'
                  : 'bg-neo-navy text-white border-white/10',
              )}
            >
              <span className="text-base leading-none" aria-hidden="true">
                {ICON[type] ?? '•'}
              </span>
              <span className={cn(
                'uppercase tracking-wide leading-none',
                isLeader ? 'text-neo-black/70' : 'text-white/55',
              )}>
                {t(`blast.tileGuide.${type}.name`) || type}
              </span>
              <span className={cn(
                'tabular-nums font-black leading-none',
                isLeader ? 'text-neo-black' : 'text-white',
              )}>
                ×{count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

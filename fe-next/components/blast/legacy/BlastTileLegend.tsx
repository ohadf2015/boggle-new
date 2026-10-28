'use client';

import { BLAST_TILE_TYPE_LIST } from '@/shared/types/blast';
import { cn } from '@/lib/utils';
import { TILE_VISUALS } from './blastTileVisuals';

export const GUIDE_TILE_TYPES = BLAST_TILE_TYPE_LIST;

interface BlastTileLegendListProps {
  t: (key: string) => string | undefined;
  /** Rail variant: tighter rows for a desktop side column. */
  compact?: boolean;
}

/** Every live tile type with its in-game visual (TILE_VISUALS is the single source of truth). */
export function BlastTileLegendList({ t, compact = false }: BlastTileLegendListProps) {
  return (
    <ul className={cn('grid grid-cols-1', compact ? 'gap-1.5' : 'gap-2')}>
      {GUIDE_TILE_TYPES.map((type) => {
        const visual = TILE_VISUALS[type];
        const Icon = visual.indicator;
        return (
          <li
            key={type}
            data-tile-type={type}
            className={cn(
              'flex items-center gap-3 rounded-neo',
              compact ? 'bg-black/25 px-2.5 py-1.5' : 'bg-white/5 border border-white/10 px-3 py-2',
            )}
          >
            <span
              className={cn(
                'shrink-0 flex items-center justify-center rounded-neo border-2 border-black/40',
                compact ? 'w-8 h-8' : 'w-10 h-10',
                visual.text,
              )}
              style={visual.style}
              aria-hidden="true"
            >
              {Icon ? <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={2.5} /> : null}
            </span>
            <span className="min-w-0">
              <span className="block font-neo-display font-bold text-neo-white text-sm capitalize">
                {t(`blast.tileGuide.${type}.name`)}
              </span>
              <span className={cn('block font-neo-body text-xs', compact ? 'text-neo-cream/70 leading-snug' : 'text-white')}>
                {t(`blast.tileGuide.${type}.desc`)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

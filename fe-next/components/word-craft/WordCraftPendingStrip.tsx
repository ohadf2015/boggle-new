'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { PlacedTile } from '@/lib/word-craft/types';
import type { Axis } from '@/lib/word-craft/placement';
import { displayTileLetter } from '@/lib/word-craft/blankAssign';
import { WordCraftAxisChip } from './WordCraftAxisChip';

export interface WordCraftPendingStripProps {
  pending: PlacedTile[];
  axis: Axis;
  /** Tap a tile in the strip → recall it. */
  onRecallOne: (rackTileId: string) => void;
  /** Tap the header ✕ → recall every pending tile. */
  onRecallAll: () => void;
  /** Optional flip-axis handler. */
  onFlipAxis?: () => void;
  locale?: string;
  labels: {
    headerEmpty: string;
    recallAll: string;
    recallOne: string;
    axisHorizontal: string;
    axisVertical: string;
    axisFlipAria: string;
  };
}

/**
 * Compact horizontal strip showing the word being built, in axis order.
 * Empty pending → renders a thin placeholder so the layout doesn't reflow on
 * first placement.
 */
function WordCraftPendingStripImpl({
  pending,
  axis,
  onRecallOne,
  onRecallAll,
  onFlipAxis,
  locale = 'en',
  labels,
}: WordCraftPendingStripProps) {
  const ordered = useMemo(() => {
    if (axis === 'h') return [...pending].sort((a, b) => a.col - b.col);
    if (axis === 'v') return [...pending].sort((a, b) => a.row - b.row);
    return pending;
  }, [pending, axis]);

  if (pending.length === 0) {
    return (
      <div
        data-wc-pending-strip="empty"
        className="flex items-center justify-center min-h-[32px] px-2 text-xs text-neo-white italic font-neo-body shrink-0"
      >
        {labels.headerEmpty}
      </div>
    );
  }

  return (
    <div
      data-wc-pending-strip={axis ? `locked-${axis}` : 'free'}
      lang={locale}
      className={cn(
        'flex items-center gap-2 px-2 py-1 shrink-0',
        'bg-black/30 rounded-neo border-2 border-black',
        'overflow-x-auto scrollbar-none',
      )}
    >
      <WordCraftAxisChip
        axis={axis}
        onFlip={onFlipAxis}
        labelHorizontal={labels.axisHorizontal}
        labelVertical={labels.axisVertical}
        ariaLabel={labels.axisFlipAria}
      />
      <ul className="flex items-center gap-1 flex-1 min-w-0">
        {ordered.map((p) => (
          <li key={p.rackTileId}>
            <button
              type="button"
              onClick={() => onRecallOne(p.rackTileId)}
              aria-label={`${labels.recallOne}: ${displayTileLetter(p)}`}
              data-wc-pending-tile={p.rackTileId}
              data-joker={p.isBlank ? 'true' : undefined}
              className={cn(
                'relative inline-flex items-center justify-center',
                'w-8 h-9 rounded-neo border-2 border-black text-neo-navy',
                p.isBlank ? 'bg-neo-purple-light text-neo-white' : 'bg-neo-lime',
                'shadow-hard-sm font-neo-display font-black text-base',
                'transition-transform active:scale-90 hover:-translate-y-0.5 hover:bg-neo-pink hover:text-neo-white',
              )}
            >
              {displayTileLetter(p)}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onRecallAll}
        aria-label={labels.recallAll}
        data-wc-pending-recall-all
        className={cn(
          'inline-flex items-center justify-center w-7 h-7 shrink-0',
          'rounded-full border-2 border-black bg-neo-red text-white',
          'shadow-hard-sm font-bold text-sm',
          'transition-transform active:scale-90 hover:-translate-y-0.5',
        )}
      >
        ×
      </button>
    </div>
  );
}

export const WordCraftPendingStrip = memo(WordCraftPendingStripImpl);

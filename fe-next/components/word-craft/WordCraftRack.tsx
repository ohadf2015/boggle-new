'use client';

import { memo } from 'react';
import type { RackTile } from '@/lib/word-craft/types';
import { cn } from '@/lib/utils';

export interface WordCraftRackProps {
  tiles: RackTile[];
  selectedId: string | null;
  pendingIds: Set<string>;
  onSelect: (id: string | null) => void;
  /** pointerdown handler — begins a drag-to-place gesture */
  onTileDragStart?: (tile: RackTile, e: React.PointerEvent) => void;
  /** True if the previous gesture ended in a drop — suppress click-toggle */
  consumeDropFlag?: () => boolean;
  disabled?: boolean;
  ariaLabel: string;
  hintPick?: boolean;
  locale?: string;
  /** ID of the tile currently being dragged — fades it in the rack */
  draggingTileId?: string | null;
}

const TILT = ['-rotate-3', '-rotate-1', 'rotate-1', 'rotate-3', '-rotate-2', 'rotate-2', '-rotate-1'];

function WordCraftRackImpl({
  tiles,
  selectedId,
  pendingIds,
  onSelect,
  onTileDragStart,
  consumeDropFlag,
  disabled,
  ariaLabel,
  hintPick,
  locale = 'en',
  draggingTileId,
}: WordCraftRackProps) {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      data-rack-hint-pick={hintPick ? 'true' : undefined}
      lang={locale}
      className={cn(
        'flex gap-2 sm:gap-3 justify-center flex-wrap p-3 pt-5 shrink-0',
        'bg-black/20 rounded-neo transition-shadow',
        hintPick && 'wc-rack-glow',
      )}
    >
      {tiles.map((tile, idx) => {
        const isPending = pendingIds.has(tile.id);
        const isSelected = selectedId === tile.id;
        const isDragging = draggingTileId === tile.id;
        const tilt = !isPending && !isSelected && !isDragging ? TILT[idx % TILT.length] : '';
        return (
          <button
            key={tile.id}
            type="button"
            data-rack-tile-id={tile.id}
            disabled={disabled || isPending}
            aria-pressed={isSelected}
            onPointerDown={(e) => {
              if (disabled || isPending) return;
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              onTileDragStart?.(tile, e);
            }}
            onClick={() => {
              // If the gesture ended as a drop, the tile is now pending — skip toggle.
              if (consumeDropFlag?.()) return;
              onSelect(isSelected ? null : tile.id);
            }}
            className={cn(
              'relative w-14 h-16 sm:w-16 sm:h-[72px] flex items-center justify-center touch-manipulation',
              'rounded-neo border-neo-thick border-black',
              'transition-all duration-200 ease-out',
              tilt,
              isPending
                ? 'opacity-30 bg-neo-cream/50 text-neo-navy cursor-not-allowed shadow-hard-pressed'
                : isDragging
                  ? 'opacity-30 bg-neo-cream text-neo-navy shadow-hard-pressed scale-95'
                  : isSelected
                    ? 'bg-neo-lime text-neo-navy shadow-hard-lg -translate-y-2 scale-110 z-10'
                    : 'bg-neo-cream text-neo-navy shadow-hard hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed',
            )}
          >
            <span aria-hidden className="absolute inset-x-1.5 top-1 h-px bg-white/70" />
            <span className="wc-tile-glyph relative text-3xl sm:text-4xl">
              {tile.letter === '_' ? '·' : tile.letter}
            </span>
            <span
              className="absolute bottom-1 end-1.5 text-[10px] sm:text-[11px] opacity-60 font-neo-body font-bold tabular-nums"
              aria-hidden
            >
              {tile.value}
            </span>
            {isSelected && (
              <span
                aria-hidden
                className="absolute -top-1.5 -end-1.5 w-3.5 h-3.5 rounded-full bg-neo-pink border-2 border-black animate-ping"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export const WordCraftRack = memo(WordCraftRackImpl);

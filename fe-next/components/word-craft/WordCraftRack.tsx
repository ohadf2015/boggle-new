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
  /**
   * If provided + axisLocked is true, a single tap on a non-pending rack tile
   * fires this instead of toggling selection — auto-places along the locked axis.
   */
  onFastTap?: (tile: RackTile) => void;
  /** True when an axis is inferred from the current pending placements. */
  axisLocked?: boolean;
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
  onFastTap,
  axisLocked,
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
      data-axis-locked={axisLocked ? 'true' : undefined}
      lang={locale}
      className={cn(
        // Horizontal scroll-snap rail: tiles never wrap. On wide phones (≥390px)
        // 7 tiles fit naturally; on narrower viewports the rail scrolls with snap.
        'flex gap-2 sm:gap-3 items-center justify-center p-3 pt-5 shrink-0',
        'overflow-x-auto overflow-y-hidden flex-nowrap',
        'snap-x snap-mandatory scroll-px-4 scrollbar-none',
        'bg-black/20 rounded-neo transition-shadow',
        hintPick && 'wc-rack-glow',
      )}
      style={{
        // Keep contents readable: maintain at least one tile-height so layout
        // doesn't collapse if rack briefly empties.
        minHeight: '5.5rem',
      }}
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
            data-fast-tap={axisLocked && !isPending ? 'true' : undefined}
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
              if (axisLocked && onFastTap) {
                onFastTap(tile);
                return;
              }
              onSelect(isSelected ? null : tile.id);
            }}
            className={cn(
              'relative w-14 h-16 sm:w-16 sm:h-[72px] flex items-center justify-center touch-manipulation shrink-0 snap-center',
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

'use client';

import { memo } from 'react';
import type { RackTile } from '@/lib/word-craft/types';
import { displayTileLetter } from '@/lib/word-craft/blankAssign';
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
  /**
   * True once a REAL axis is locked (≥2 collinear tiles), where the next empty
   * cell along the line is deterministic and the only legal placement. When set,
   * a single tap on ANY non-pending tile auto-places it — no select, no cell-tap,
   * no double-tap. Strictly gated to ≥2 tiles so the length-1 direction choice
   * (which was the source of the old "tap doesn't work" confusion) stays explicit.
   */
  autoPlaceOnTap?: boolean;
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
  autoPlaceOnTap,
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
        // Horizontal scroll-snap rail: tiles never wrap. We do NOT use
        // justify-center because that traps overflowed tiles outside the
        // visible area on narrow phones. Instead a wrapper inside centers
        // when content fits, and the outer scroller is justify-start so
        // the first tile is always reachable from the scroll-start edge.
        'shrink-0 overflow-x-auto overflow-y-hidden',
        // proximity (not mandatory) so the rail pans freely between letters
        // instead of force-locking onto a tile; overscroll-x-contain stops the
        // swipe from chaining to the page; scroll-smooth eases programmatic
        // scroll-into-view of the selected tile.
        'snap-x snap-proximity scroll-smooth overscroll-x-contain scrollbar-none',
        'bg-black/20 rounded-neo transition-shadow',
        hintPick && 'wc-rack-glow',
      )}
      style={{
        // Keep contents readable: maintain at least one tile-height so layout
        // doesn't collapse if rack briefly empties.
        minHeight: '5.5rem',
        // End-of-content padding ensures the last tile can scroll fully into
        // view without being clipped by the scroll viewport edge.
        scrollPaddingInline: '1rem',
      }}
    >
      <div
        className={cn(
          'flex gap-2 sm:gap-3 items-center justify-start p-3 pt-5',
          'mx-auto w-fit max-w-full flex-nowrap',
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
            data-fast-tap={autoPlaceOnTap || (axisLocked && isSelected) ? 'true' : undefined}
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
              // Real axis locked (≥2 collinear tiles): a single tap on ANY tile
              // auto-places it at the only legal next cell. This is the
              // lightweight "tap-tap-tap to spell" flow for letters 3..7. It is
              // unambiguous (one legal cell), so it cannot reproduce the old
              // length-1 "tap doesn't work" confusion — that was direction
              // ambiguity, which only exists before a real axis is set.
              if (autoPlaceOnTap && onFastTap) {
                onFastTap(tile);
                return;
              }
              // Length-1 convenience: re-tapping the ALREADY-selected tile while a
              // (provisional) axis is locked auto-places along the chosen axis.
              // Tapping any OTHER tile just selects it — so "tap a letter, then
              // tap the cell I want" still works while the direction is being set.
              if (isSelected && axisLocked && onFastTap) {
                onFastTap(tile);
                return;
              }
              onSelect(isSelected ? null : tile.id);
            }}
            className={cn(
              // touch-pan-x lets the browser handle horizontal swipe of the
              // rack (so all 7 tiles are reachable on narrow phones —
              // player complaint 2026-05-13 "can't swipe to see more letters").
              // useWordCraftDrag direction-gates touch activation so
              // vertical-dominant motion still wins for drag-to-board.
              // Desktop cursor: grab on draggable tiles, not-allowed when
              // pending or disabled so mouse players see the affordance.
              'relative w-14 h-16 sm:w-16 sm:h-[72px] flex items-center justify-center touch-pan-x shrink-0 snap-center',
              disabled || isPending ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
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
            <span
              className={cn('wc-tile-glyph relative text-3xl sm:text-4xl', tile.isBlank && 'text-neo-purple')}
            >
              {displayTileLetter(tile)}
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
    </div>
  );
}

export const WordCraftRack = memo(WordCraftRackImpl);

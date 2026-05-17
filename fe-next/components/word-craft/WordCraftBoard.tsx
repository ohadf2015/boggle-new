'use client';

import { memo, useMemo } from 'react';
import type { Board } from '@/lib/word-craft/board';
import type { PlacedTile, PremiumKind } from '@/lib/word-craft/types';
import { hebrewDisplayLetter } from '@/lib/word-craft/hebrewDisplay';
import { scoreDotTier, TIER_COLOR_CLASS } from '@/lib/word-craft/scoreDotTier';
import { cn } from '@/lib/utils';

export interface WordCraftBoardProps {
  board: Board;
  pendingPlacements: PlacedTile[];
  onCellClick: (row: number, col: number) => void;
  /** Tap a pending tile on the board to send it back to the rack */
  onRecallPending?: (rackTileId: string) => void;
  disabled?: boolean;
  hasSelectedTile?: boolean;
  isFirstMove?: boolean;
  /** During an active drag: cell key 'r,c' that the dragged tile is hovering over */
  dragHoverCell?: string | null;
  /** Active locale — drives Hebrew sofit auto-display */
  locale?: string;
  /** Keyboard reticle position — renders a focus ring on this cell */
  reticle?: { row: number; col: number } | null;
  /**
   * Compact per-kind multiplier labels (e.g. TW → "3W") shown inside empty
   * premium cells. Without this, the saturation-tier tints alone don't tell
   * a player triple-word from double-word — they only differ by opacity.
   */
  premiumLabels?: Partial<Record<PremiumKind, string>>;
}

// Brand-tinted premium squares (no text labels). Each premium kind gets a
// distinct neo-color. Saturation tier preserves TW > DW and TL > DL ordering;
// every tier now carries an inset ring — old DW @30% and DL @25% fell below
// WCAG 3:1 on the navy base and disappeared on bright outdoor mobile screens.
const PREMIUM_TINT: Record<PremiumKind, string> = {
  TW: 'bg-neo-pink/65 ring-2 ring-inset ring-neo-pink',       // Triple word — boldest
  DW: 'bg-neo-pink/45 ring-1 ring-inset ring-neo-pink/70',    // Double word — softer pink
  TL: 'bg-neo-cyan/60 ring-2 ring-inset ring-neo-cyan',       // Triple letter — boldest cyan
  DL: 'bg-neo-cyan/40 ring-1 ring-inset ring-neo-cyan/70',    // Double letter — softer cyan
};

/** Build the set of axis-hint cells (N/E/S/W neighbors) for a single anchor. */
function computeAxisHintCells(pending: PlacedTile[], boardSize: number): Set<string> {
  if (pending.length !== 1) return new Set();
  const { row, col } = pending[0];
  const out = new Set<string>();
  if (row - 1 >= 0) out.add(`${row - 1},${col}`);
  if (row + 1 < boardSize) out.add(`${row + 1},${col}`);
  if (col - 1 >= 0) out.add(`${row},${col - 1}`);
  if (col + 1 < boardSize) out.add(`${row},${col + 1}`);
  return out;
}

function WordCraftBoardImpl({
  board,
  pendingPlacements,
  onCellClick,
  onRecallPending,
  disabled,
  hasSelectedTile,
  isFirstMove,
  dragHoverCell,
  locale = 'en',
  reticle,
  premiumLabels,
}: WordCraftBoardProps) {
  const size = board.size;
  const centerIndex = Math.floor(size / 2);
  const pendingByCoord = new Map<string, PlacedTile>();
  for (const p of pendingPlacements) pendingByCoord.set(`${p.row},${p.col}`, p);

  const axisHintCells = useMemo(
    () => computeAxisHintCells(pendingPlacements, size),
    [pendingPlacements, size],
  );

  // Roving tabindex anchor: only ONE cell carries tabIndex=0 so keyboard
  // users hit a single tab stop on the board instead of 121. Reticle drives
  // the anchor when set; otherwise we fall back to center (or the first
  // empty cell scanning row-major if center is already occupied). Arrow
  // keys move the reticle and the anchor follows.
  const tabAnchor = (() => {
    if (reticle) return reticle;
    if (!board.cells[centerIndex]?.[centerIndex]?.tile) {
      return { row: centerIndex, col: centerIndex };
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!board.cells[r][c].tile) return { row: r, col: c };
      }
    }
    return { row: 0, col: 0 };
  })();

  // Fewer cells → larger fonts. 11/13/15 boards each get a tuned glyph size.
  const tileFontClass = size <= 11 ? 'text-lg sm:text-xl' : size === 13 ? 'text-base sm:text-lg' : 'text-sm sm:text-base';

  return (
    <div
      role="grid"
      aria-label="WordCraft board"
      data-tile-selected={hasSelectedTile ? 'true' : undefined}
      data-board-size={size}
      className="grid bg-black border-neo-thick border-black rounded-neo p-1.5 shadow-hard-lg w-full h-full @container"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        gap: 2,
      }}
    >
      {board.cells.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          const pending = pendingByCoord.get(key);
          const placedTile = cell.tile;
          const isCenter = r === centerIndex && c === centerIndex;
          const isInteractive = !disabled && !placedTile;
          const isEmpty = !placedTile && !pending;
          const inviteEmpty = isEmpty && hasSelectedTile && !disabled;
          const inviteCenter = isCenter && isEmpty && isFirstMove && !disabled;
          const isDragTarget = dragHoverCell === key && isEmpty;
          const isAxisHint = axisHintCells.has(key) && isEmpty && !disabled;
          const isReticle = reticle?.row === r && reticle?.col === c;
          const isTabAnchor = tabAnchor.row === r && tabAnchor.col === c;

          // Build a screen-reader label that includes tile state so blind
          // players know what's on the cell during keyboard navigation —
          // previously the label only read coords + premium type, never the
          // actual letter placed there. Center cell announces "center start"
          // on an empty board to surface the first-move requirement.
          const occupant = pending ? `pending ${pending.letter}` : placedTile ? `letter ${placedTile.letter} value ${placedTile.value}` : 'empty';
          const centerHint = isCenter && isEmpty && isFirstMove ? ' center start' : '';
          const ariaLabel = `row ${r + 1} column ${c + 1}${cell.premium ? ` ${cell.premium}` : ''} ${occupant}${centerHint}`;

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              data-board-cell={key}
              data-premium={cell.premium ?? ''}
              data-claim={placedTile && cell.claim ? cell.claim : undefined}
              data-tile-id={pending?.rackTileId ?? placedTile?.rackTileId ?? undefined}
              data-tile-state={pending ? 'pending' : placedTile ? 'placed' : 'empty'}
              data-cell-invite={inviteEmpty ? 'true' : undefined}
              data-cell-center-ping={inviteCenter ? 'true' : undefined}
              data-drag-target={isDragTarget ? 'true' : undefined}
              data-axis-hint={isAxisHint ? 'true' : undefined}
              data-reticle={isReticle ? 'true' : undefined}
              aria-label={ariaLabel}
              tabIndex={isTabAnchor ? 0 : -1}
              disabled={!isInteractive}
              onClick={() => {
                if (!isInteractive) return;
                if (pending && onRecallPending) {
                  onRecallPending(pending.rackTileId);
                  return;
                }
                onCellClick(r, c);
              }}
              className={cn(
                'relative aspect-square flex items-center justify-center select-none touch-manipulation',
                'transition-all duration-150',
                placedTile
                  ? cn(
                      'bg-neo-cream text-neo-navy shadow-[0_2px_0_0_rgba(0,0,0,0.85)]',
                      cell.claim === 'player' && 'ring-2 ring-inset ring-neo-cyan',
                      cell.claim === 'bot' && 'ring-2 ring-inset ring-neo-pink',
                    )
                  : pending
                    ? 'bg-neo-lime text-neo-navy shadow-[0_3px_0_0_rgba(0,0,0,0.9)] ring-2 ring-neo-lime-light hover:ring-neo-pink hover:rotate-1'
                    : isCenter
                      ? 'bg-neo-pink text-neo-cream ring-1 ring-inset ring-neo-pink-light'
                      : (cell.premium && PREMIUM_TINT[cell.premium]) || 'bg-neo-navy-light/80',
                isDragTarget && 'bg-neo-cyan/30 ring-4 ring-neo-cyan scale-110 z-10',
                isAxisHint && !isDragTarget && 'wc-axis-hint',
                // Was ring-4 + ring-offset-1, eating ~10 px of an 11×11 cell
                // (≈ 30 px wide) and obscuring the glyph for keyboard players.
                // Halve to ring-2 and drop the offset so the underlying tile
                // letter stays readable.
                isReticle && !isDragTarget && 'ring-2 ring-neo-yellow z-10',
                !isInteractive && !pending && 'cursor-not-allowed',
                // Desktop: explicit cursor + stronger hover tint so empty
                // cells visibly invite interaction (was bg-neo-cyan/15 →
                // bumped to /25 because /15 fades against the dark navy
                // base on mid-brightness monitors). focus-visible ring is
                // the keyboard-Tab affordance separate from the reticle.
                isInteractive && !pending && 'cursor-pointer hover:bg-neo-cyan/25 active:scale-95',
                isInteractive && 'focus-visible:ring-2 focus-visible:ring-neo-yellow focus-visible:z-10 focus-visible:outline-none',
                pending && 'cursor-pointer',
                inviteEmpty && 'wc-cell-invite',
                inviteCenter && 'wc-cell-center-ping',
              )}
              style={{ minWidth: 0 }}
            >
              {placedTile ? (
                <>
                  <span className={cn('wc-tile-glyph font-bold', 'text-[clamp(14px,5cqi,32px)]')}>
                    {placedTile.letter === '_'
                      ? '·'
                      : hebrewDisplayLetter({
                          board,
                          pending: pendingPlacements,
                          row: r,
                          col: c,
                          letter: placedTile.letter,
                          locale,
                        })}
                  </span>
                  <span
                    data-score-dot
                    className={cn(
                      'absolute bottom-[6%] end-[6%] w-[14%] h-[14%] rounded-full',
                      TIER_COLOR_CLASS[scoreDotTier(placedTile.value)],
                    )}
                    aria-hidden="true"
                  />
                </>
              ) : pending ? (
                <span className={cn('wc-tile-glyph', tileFontClass)}>
                  {pending.letter === '_'
                    ? '·'
                    : hebrewDisplayLetter({
                        board,
                        pending: pendingPlacements,
                        row: r,
                        col: c,
                        letter: pending.letter,
                        locale,
                      })}
                </span>
              ) : isAxisHint ? (
                // tiny dot hints player at where next tile in a line could go
                <span aria-hidden className="block w-1.5 h-1.5 rounded-full bg-neo-cyan/60" />
              ) : isCenter ? (
                <span aria-hidden className={cn('drop-shadow', size <= 11 ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg')}>★</span>
              ) : cell.premium && premiumLabels?.[cell.premium] ? (
                // Compact multiplier label. aria-hidden — the cell's
                // aria-label already announces the premium kind for SR users;
                // this glyph is the sighted-player affordance. Hard black
                // shadow keeps cream text legible on every tint tier.
                <span
                  aria-hidden
                  className="font-neo-display font-black leading-none select-none text-neo-cream/95 text-[clamp(6px,2.4cqi,11px)] drop-shadow-[1px_1px_0_rgba(0,0,0,0.9)]"
                >
                  {premiumLabels[cell.premium]}
                </span>
              ) : null}
            </button>
          );
        }),
      )}
    </div>
  );
}

export const WordCraftBoard = memo(WordCraftBoardImpl);

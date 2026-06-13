'use client';

import { memo, useMemo } from 'react';
import type { Board } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';
import { JOKER_GLYPH, isUnassignedBlank } from '@/lib/word-craft/blankAssign';
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
  /**
   * Active locale. Accepted for API parity with callers; the board renders the
   * raw stored glyph for every locale. Hebrew tiles deliberately stay in their
   * REGULAR form — never a sofit/final form — because a board tile is shared by
   * its across and down word, so a "final" glyph would be ambiguous and read as
   * a bug. (The tile bag never holds sofit forms either.)
   */
  locale?: string;
  /** Keyboard reticle position — renders a focus ring on this cell */
  reticle?: { row: number; col: number } | null;
}

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
  reticle,
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
  // users hit a single tab stop on the board instead of N². Reticle drives the
  // anchor when set; otherwise we fall back to the geometric middle (a neutral
  // keyboard starting point — there is no center star in Conquest), then the
  // first empty cell if the middle is occupied.
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
      data-wc-board=""
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
          const owner = placedTile ? cell.claim ?? null : null;
          const isInteractive = !disabled && !placedTile;
          const isEmpty = !placedTile && !pending;
          const inviteEmpty = isEmpty && hasSelectedTile && !disabled;
          const isDragTarget = dragHoverCell === key && isEmpty;
          const isAxisHint = axisHintCells.has(key) && isEmpty && !disabled;
          const isReticle = reticle?.row === r && reticle?.col === c;
          const isTabAnchor = tabAnchor.row === r && tabAnchor.col === c;

          // Screen-reader label includes WHO owns the tile — territory is the
          // whole game, so a blind player needs to hear "your" vs "rival"
          // ground as they sweep the grid.
          const occupant = pending
            ? `pending ${pending.letter}`
            : placedTile
              ? `${owner === 'player' ? 'your' : owner === 'bot' ? 'rival' : ''} letter ${placedTile.letter}`.trim()
              : 'empty';
          const ariaLabel = `row ${r + 1} column ${c + 1} ${occupant}`;

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              data-board-cell={key}
              data-premium=""
              data-claim={placedTile && cell.claim ? cell.claim : undefined}
              data-tile-id={pending?.rackTileId ?? placedTile?.rackTileId ?? undefined}
              data-tile-state={pending ? 'pending' : placedTile ? 'placed' : 'empty'}
              data-cell-invite={inviteEmpty ? 'true' : undefined}
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
                // Smooth territory "flood": background colour eases in as a cell
                // is claimed or flipped. transition-colors only — no layout churn.
                'transition-colors duration-200',
                placedTile
                  ? // Owned ground is a solid electric block — cyan = you,
                    // pink = rival — so the board's balance of power reads at a
                    // glance, even across a TV room.
                    owner === 'player'
                    ? 'bg-neo-cyan text-neo-navy shadow-[0_2px_0_0_rgba(0,0,0,0.85)]'
                    : owner === 'bot'
                      ? 'bg-neo-pink text-neo-white shadow-[0_2px_0_0_rgba(0,0,0,0.85)]'
                      : 'bg-neo-cream text-neo-navy shadow-[0_2px_0_0_rgba(0,0,0,0.85)]'
                  : pending
                    ? 'bg-neo-lime text-neo-navy shadow-[0_3px_0_0_rgba(0,0,0,0.9)] ring-2 ring-neo-lime-light hover:ring-neo-pink hover:rotate-1'
                    : 'bg-neo-navy-light/70',
                isDragTarget && 'bg-neo-cyan/30 ring-4 ring-neo-cyan scale-110 z-10',
                isAxisHint && !isDragTarget && 'wc-axis-hint',
                isReticle && !isDragTarget && 'ring-2 ring-neo-yellow z-10',
                !isInteractive && !pending && 'cursor-not-allowed',
                isInteractive && !pending && 'cursor-pointer hover:bg-neo-cyan/25 active:scale-95',
                isInteractive && 'focus-visible:ring-2 focus-visible:ring-neo-yellow focus-visible:z-10 focus-visible:outline-none',
                pending && 'cursor-pointer',
                inviteEmpty && 'wc-cell-invite',
              )}
              style={{ minWidth: 0 }}
            >
              {placedTile ? (
                <>
                  {placedTile.isBlank && (
                    <span
                      data-joker-badge
                      aria-hidden
                      className="absolute top-[6%] start-[6%] text-neo-purple text-[clamp(6px,2.4cqi,11px)] leading-none"
                    >
                      {JOKER_GLYPH}
                    </span>
                  )}
                  <span className={cn('wc-tile-glyph font-bold', 'text-[clamp(14px,5cqi,32px)]')}>
                    {isUnassignedBlank(placedTile) ? JOKER_GLYPH : placedTile.letter}
                  </span>
                </>
              ) : pending ? (
                <span className={cn('wc-tile-glyph relative', tileFontClass)}>
                  {pending.isBlank && (
                    <span
                      data-joker-badge
                      aria-hidden
                      className="absolute -top-1 -start-1 text-neo-purple text-[0.5em] leading-none"
                    >
                      {JOKER_GLYPH}
                    </span>
                  )}
                  {isUnassignedBlank(pending) ? JOKER_GLYPH : pending.letter}
                </span>
              ) : isAxisHint ? (
                // tiny dot hints player at where next tile in a line could go
                <span aria-hidden className="block w-1.5 h-1.5 rounded-full bg-neo-cyan/60" />
              ) : null}
            </button>
          );
        }),
      )}
    </div>
  );
}

export const WordCraftBoard = memo(WordCraftBoardImpl);

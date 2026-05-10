'use client';

import { memo, useMemo } from 'react';
import { CENTER, type Board } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';
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
}

const PREMIUM_MULT: Record<string, { mult: '×2' | '×3'; kind: 'L' | 'W' }> = {
  DL: { mult: '×2', kind: 'L' },
  TL: { mult: '×3', kind: 'L' },
  DW: { mult: '×2', kind: 'W' },
  TW: { mult: '×3', kind: 'W' },
};

const PREMIUM_WASH: Record<string, string> = {
  DL: 'bg-neo-cyan/10',
  TL: 'bg-neo-cyan/22',
  DW: 'bg-neo-pink/10',
  TW: 'bg-neo-pink/22',
};

const PREMIUM_INK: Record<string, string> = {
  DL: 'text-neo-cyan/90',
  TL: 'text-neo-cyan',
  DW: 'text-neo-pink/90',
  TW: 'text-neo-pink',
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
}: WordCraftBoardProps) {
  const size = board.cells.length;
  const pendingByCoord = new Map<string, PlacedTile>();
  for (const p of pendingPlacements) pendingByCoord.set(`${p.row},${p.col}`, p);

  const axisHintCells = useMemo(
    () => computeAxisHintCells(pendingPlacements, size),
    [pendingPlacements, size],
  );

  // Fewer cells → larger fonts. 11/13/15 boards each get a tuned glyph size.
  const tileFontClass = size <= 11 ? 'text-lg sm:text-xl' : size === 13 ? 'text-base sm:text-lg' : 'text-sm sm:text-base';
  const multFontClass = size <= 11 ? 'text-[12px] sm:text-[14px]' : size === 13 ? 'text-[11px] sm:text-[13px]' : 'text-[10px] sm:text-[12px]';

  return (
    <div
      role="grid"
      aria-label="WordCraft board"
      data-tile-selected={hasSelectedTile ? 'true' : undefined}
      data-board-size={size}
      className="grid bg-black border-neo-thick border-black rounded-neo p-1.5 shadow-hard-lg w-full h-full"
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
          const isCenter = r === CENTER && c === CENTER;
          const premiumKey = cell.premium ?? '';
          const isInteractive = !disabled && !placedTile;
          const isEmpty = !placedTile && !pending;
          const inviteEmpty = isEmpty && hasSelectedTile && !disabled;
          const inviteCenter = isCenter && isEmpty && isFirstMove && !disabled;
          const isDragTarget = dragHoverCell === key && isEmpty;
          const isAxisHint = axisHintCells.has(key) && isEmpty && !disabled;
          const premium = cell.premium ? PREMIUM_MULT[cell.premium] : null;

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              data-board-cell={key}
              data-tile-id={pending?.rackTileId ?? placedTile?.rackTileId ?? undefined}
              data-tile-state={pending ? 'pending' : placedTile ? 'placed' : 'empty'}
              data-cell-invite={inviteEmpty ? 'true' : undefined}
              data-cell-center-ping={inviteCenter ? 'true' : undefined}
              data-drag-target={isDragTarget ? 'true' : undefined}
              data-axis-hint={isAxisHint ? 'true' : undefined}
              aria-label={`row ${r + 1} column ${c + 1}${cell.premium ? ` ${cell.premium}` : ''}`}
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
                  ? 'bg-neo-cream text-neo-navy shadow-[0_2px_0_0_rgba(0,0,0,0.85)]'
                  : pending
                    ? 'bg-neo-lime text-neo-navy shadow-[0_3px_0_0_rgba(0,0,0,0.9)] ring-2 ring-neo-lime-light hover:ring-neo-pink hover:rotate-1'
                    : isCenter
                      ? 'bg-neo-pink/35 text-neo-cream'
                      : (cell.premium && PREMIUM_WASH[cell.premium]) || 'bg-neo-navy-light/40',
                isDragTarget && 'bg-neo-cyan/30 ring-4 ring-neo-cyan scale-110 z-10',
                isAxisHint && !isDragTarget && 'wc-axis-hint',
                !isInteractive && !pending && 'cursor-not-allowed',
                isInteractive && !pending && 'hover:bg-neo-cyan/15 active:scale-95',
                inviteEmpty && 'wc-cell-invite',
                inviteCenter && 'wc-cell-center-ping',
              )}
              style={{ minWidth: 0 }}
            >
              {placedTile ? (
                <span className={cn('wc-tile-glyph', tileFontClass)}>
                  {placedTile.letter === '_' ? '·' : placedTile.letter}
                </span>
              ) : pending ? (
                <span className={cn('wc-tile-glyph', tileFontClass)}>
                  {pending.letter === '_' ? '·' : pending.letter}
                </span>
              ) : isAxisHint ? (
                // tiny dot hints player at where next tile in a line could go
                <span aria-hidden className="block w-1.5 h-1.5 rounded-full bg-neo-cyan/60" />
              ) : isCenter ? (
                <span aria-hidden className={cn('drop-shadow', size <= 11 ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg')}>★</span>
              ) : premium ? (
                <>
                  <span className={cn('wc-mult', multFontClass, PREMIUM_INK[premiumKey])}>
                    {premium.mult}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'absolute bottom-0.5 end-0.5 text-[7px] sm:text-[9px] font-black opacity-50',
                      PREMIUM_INK[premiumKey],
                    )}
                  >
                    {premium.kind}
                  </span>
                </>
              ) : null}
            </button>
          );
        }),
      )}
    </div>
  );
}

export const WordCraftBoard = memo(WordCraftBoardImpl);

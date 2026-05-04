'use client';

import { memo } from 'react';
import { BOARD_SIZE, CENTER, type Board } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';
import { cn } from '@/lib/utils';

export interface WordCraftBoardProps {
  board: Board;
  pendingPlacements: PlacedTile[];
  onCellClick: (row: number, col: number) => void;
  disabled?: boolean;
}

const PREMIUM_LABEL: Record<string, string> = {
  DL: '2L',
  TL: '3L',
  DW: '2W',
  TW: '3W',
};

const PREMIUM_BG: Record<string, string> = {
  DL: 'bg-neo-cyan-muted/40',
  TL: 'bg-neo-cyan-muted/70',
  DW: 'bg-neo-pink-muted/40',
  TW: 'bg-neo-pink-muted/70',
};

function WordCraftBoardImpl({ board, pendingPlacements, onCellClick, disabled }: WordCraftBoardProps) {
  const pendingByCoord = new Map<string, PlacedTile>();
  for (const p of pendingPlacements) pendingByCoord.set(`${p.row},${p.col}`, p);

  return (
    <div
      role="grid"
      aria-label="WordCraft board"
      className="mx-auto inline-grid bg-neo-navy-light border-neo-thick border-black rounded-neo p-2 shadow-hard-lg"
      style={{
        gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
        gap: 2,
        maxWidth: 'min(100%, 720px)',
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

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-label={`row ${r + 1} column ${c + 1}${cell.premium ? ` ${cell.premium}` : ''}`}
              disabled={!isInteractive}
              onClick={() => isInteractive && onCellClick(r, c)}
              className={cn(
                'aspect-square flex items-center justify-center select-none',
                'text-[10px] sm:text-xs font-neo-display border border-black/40',
                placedTile || pending
                  ? 'bg-neo-cream text-neo-navy font-bold shadow-hard-sm'
                  : isCenter
                    ? 'bg-neo-pink/30 text-neo-white'
                    : (cell.premium && PREMIUM_BG[cell.premium]) || 'bg-neo-navy-light',
                pending && 'ring-2 ring-neo-lime',
                !isInteractive && 'cursor-not-allowed',
                isInteractive && 'hover:ring-2 hover:ring-neo-cyan',
              )}
              style={{ minWidth: 0 }}
            >
              {placedTile ? (
                <span className="text-xs sm:text-sm font-bold">
                  {placedTile.letter === '_' ? '·' : placedTile.letter}
                </span>
              ) : pending ? (
                <span className="text-xs sm:text-sm font-bold">
                  {pending.letter === '_' ? '·' : pending.letter}
                </span>
              ) : isCenter ? (
                <span className="text-base">★</span>
              ) : cell.premium ? (
                <span className="text-[8px] sm:text-[10px] opacity-80">{PREMIUM_LABEL[premiumKey]}</span>
              ) : null}
            </button>
          );
        }),
      )}
    </div>
  );
}

export const WordCraftBoard = memo(WordCraftBoardImpl);

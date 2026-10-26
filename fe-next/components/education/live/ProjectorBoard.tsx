'use client';

import type { LetterGrid } from '@/shared/types/game';

/** Modes where every student plays the SAME grid, so the wall can show it. */
const SHARED_BOARD_MODES = new Set(['classic', 'word-hunt']);

export function projectorShowsBoard(gameMode: string | undefined, grid: LetterGrid | undefined | null): boolean {
  return !!grid?.length && SHARED_BOARD_MODES.has(gameMode ?? 'classic');
}

function tileText(letter: string): string {
  return letter.length > 1 ? letter[0].toUpperCase() + letter.slice(1) : letter.toUpperCase();
}

/** The class board, read-only and sized to its cell, for the projector during a round. */
export default function ProjectorBoard({ grid, label }: { grid: LetterGrid; label: string }) {
  const cols = grid[0]?.length ?? 0;
  // A 4:3 wall makes the column taller than it is wide; the square must fit both, and the live panel keeps the rest.
  return (
    <div data-testid="projector-board-box" className="hidden h-full w-[58%] shrink-0 [container-type:size] md:block">
    <div
      role="img"
      aria-label={label}
      data-testid="projector-board"
      dir="ltr"
      className="grid size-[min(100cqw,100cqh)] gap-[0.5vw] rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light p-[0.7vw] shadow-hard-lg"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {grid.flat().map((letter, i) => (
        <span
          key={i}
          data-testid="projector-board-tile"
          className="grid place-items-center rounded-neo border-[3px] border-neo-black bg-neo-cream font-neo-display text-[2.2vw] font-black leading-none text-neo-black shadow-hard-sm"
        >
          {tileText(letter)}
        </span>
      ))}
    </div>
    </div>
  );
}

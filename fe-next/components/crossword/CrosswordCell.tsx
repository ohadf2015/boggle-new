'use client';

import { memo } from 'react';
import { displayLetter } from '@/lib/crossword/answer';
import type { Cell, PuzzleLocale } from '@/lib/crossword/types';

export interface CrosswordCellProps {
  cell: Cell;
  letter: string;
  locale: PuzzleLocale;
  isActive: boolean;
  inActiveSlot: boolean;
  isWordEnd: boolean;
  /** Every letter of a word through this cell is filled in correctly. */
  inSolvedSlot?: boolean;
  check?: 'correct' | 'wrong';
  warmth?: 'cold' | 'warm' | 'hot';
  revealed: boolean;
  onSelect: (row: number, col: number) => void;
  label: string;
  enter?: boolean;
  enterDelay?: number;
}

function CrosswordCellBase({
  cell,
  letter,
  locale,
  isActive,
  inActiveSlot,
  isWordEnd,
  inSolvedSlot = false,
  check,
  warmth,
  revealed,
  onSelect,
  label,
  enter = false,
  enterDelay = 0,
}: CrosswordCellProps) {
  // RTL is handled ONCE, by dir="rtl" on the grid container (CrosswordGrid): that reverses the CSS
  // grid inline axis, so column line 1 already lands on the right and logical col 0 renders there.
  // Mirroring the index here as well flipped it a second time and rendered Hebrew boards LTR.
  const gridColumn = cell.col + 1;
  const gridRow = cell.row + 1;

  if (cell.block) {
    return (
      <div
        aria-hidden
        className={`bg-black ${enter ? 'cw-cell-enter' : ''}`}
        style={{ gridColumn, gridRow, animationDelay: enter ? `${enterDelay}s` : undefined }}
      />
    );
  }

  const shown = letter ? displayLetter(letter, { isWordEnd }, locale) : '';

  // Newspaper look: cream paper cells, the 1px black grid gap IS the gridline. The active
  // cell is a sky-blue square and the active word a pale-yellow band — the standard
  // printed/digital crossword highlight pair. No scale pop (it lifts cells off the grid
  // plane and breaks the flat-paper illusion); the current cell instead gets a dark inset
  // ring, exactly like a pencil box around the square you're filling.
  const bg =
    check === 'wrong'
      ? isActive
        ? 'bg-neo-red'
        : warmth === 'hot'
          ? 'bg-neo-orange/45'
          : warmth === 'warm'
            ? 'bg-neo-orange/25'
            : warmth === 'cold'
              ? 'bg-[#7cc0ff]/30'
              : 'bg-neo-red/25'
      : isActive
        ? 'bg-[#7cc0ff]'
        : inActiveSlot
          ? 'bg-[#ffe9a8]'
          : // A finished word settles into a pale cyan — the single-player accent — so the
            // board itself shows which answers are locked in, not just the "N/10" counter.
            // Opaque on purpose: the grid container is black, so an alpha tint composites
            // down to a dark teal and the navy letters stop being readable. This is
            // neo-cyan at 25% over neo-cream, precomputed.
            inSolvedSlot
            ? 'bg-[#bffef4]'
            : 'bg-neo-cream';
  const text =
    check === 'wrong'
      ? isActive
        ? 'text-neo-white'
        : warmth === 'hot' || warmth === 'warm'
          ? 'text-neo-orange'
          : 'text-neo-red'
      : revealed
        ? 'text-neo-navy/55'
        : 'text-neo-navy';

  return (
    <button
      type="button"
      role="gridcell"
      data-cell
      aria-label={label}
      aria-selected={isActive}
      onClick={() => onSelect(cell.row, cell.col)}
      onPointerDown={() => onSelect(cell.row, cell.col)}
      className={`relative flex min-h-[44px] min-w-[44px] items-center justify-center font-neo-body font-bold uppercase select-none touch-manipulation transition-colors duration-75 ${bg} ${text} ${
        isActive ? 'z-10 ring-2 ring-inset ring-neo-navy' : ''
      } ${enter ? 'cw-cell-enter' : ''}`}
      style={{
        gridColumn,
        gridRow,
        fontSize: 'min(6.6vw, 1.8rem)',
        animationDelay: enter ? `${enterDelay}s` : undefined,
      }}
    >
      {cell.number != null && (
        <span
          className="absolute top-[2px] start-[3px] text-[0.6rem] leading-none font-serif font-semibold text-neo-navy/70"
          aria-hidden
        >
          {cell.number}
        </span>
      )}
      <span data-letter className="leading-none">
        {shown}
      </span>
    </button>
  );
}

export const CrosswordCell = memo(CrosswordCellBase);

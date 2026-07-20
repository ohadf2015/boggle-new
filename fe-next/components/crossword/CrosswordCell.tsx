'use client';

import { memo } from 'react';
import { displayLetter } from '@/lib/crossword/answer';
import type { Cell, PuzzleLocale } from '@/lib/crossword/types';

export interface CrosswordCellProps {
  cell: Cell;
  letter: string;
  size: number;
  rtl: boolean;
  locale: PuzzleLocale;
  isActive: boolean;
  inActiveSlot: boolean;
  isWordEnd: boolean;
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
  size,
  rtl,
  locale,
  isActive,
  inActiveSlot,
  isWordEnd,
  check,
  warmth,
  revealed,
  onSelect,
  label,
  enter = false,
  enterDelay = 0,
}: CrosswordCellProps) {
  // Column mirroring is the entire RTL story: logical col 0 renders on the right.
  const gridColumn = rtl ? size - cell.col : cell.col + 1;
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

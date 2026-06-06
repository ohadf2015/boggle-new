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
  revealed: boolean;
  onSelect: (row: number, col: number) => void;
  label: string;
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
  revealed,
  onSelect,
  label,
}: CrosswordCellProps) {
  // Column mirroring is the entire RTL story: logical col 0 renders on the right.
  const gridColumn = rtl ? size - cell.col : cell.col + 1;
  const gridRow = cell.row + 1;

  if (cell.block) {
    return (
      <div
        aria-hidden
        className="bg-neo-navy border-neo border-black rounded-[2px]"
        style={{ gridColumn, gridRow }}
      />
    );
  }

  const shown = letter ? displayLetter(letter, { isWordEnd }, locale) : '';

  const bg = isActive
    ? 'bg-neo-cyan'
    : inActiveSlot
      ? 'bg-neo-cyan-muted'
      : 'bg-neo-white';
  const text =
    check === 'wrong'
      ? 'text-neo-red'
      : check === 'correct'
        ? 'text-neo-cyan-dark'
        : revealed
          ? 'text-neo-purple'
          : 'text-neo-navy';

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={label}
      aria-selected={isActive}
      onClick={() => onSelect(cell.row, cell.col)}
      className={`relative flex items-center justify-center border-neo border-black rounded-[2px] font-neo-display font-bold uppercase select-none transition-colors ${bg} ${text} ${
        isActive ? 'shadow-hard z-10' : ''
      }`}
      style={{ gridColumn, gridRow, fontSize: 'min(6vw, 1.7rem)' }}
    >
      {cell.number != null && (
        <span
          className="absolute top-[1px] start-[2px] text-[0.55rem] leading-none font-neo-body font-medium text-neo-navy/70"
          aria-hidden
        >
          {cell.number}
        </span>
      )}
      {shown}
    </button>
  );
}

export const CrosswordCell = memo(CrosswordCellBase);

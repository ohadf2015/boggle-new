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
    return <div aria-hidden className="bg-black" style={{ gridColumn, gridRow }} />;
  }

  const shown = letter ? displayLetter(letter, { isWordEnd }, locale) : '';

  // No per-cell border — the 2px black grid gap IS the gridline (NYT-mini crispness).
  // The active cell gets the electric fill + a hard shadow + a small scale pop.
  const bg =
    check === 'wrong'
      ? isActive
        ? 'bg-neo-red'
        : 'bg-neo-red/15'
      : isActive
        ? 'bg-neo-cyan'
        : inActiveSlot
          ? 'bg-neo-cyan-light'
          : 'bg-neo-white';
  const text =
    check === 'wrong'
      ? isActive
        ? 'text-neo-white'
        : 'text-neo-red'
      : check === 'correct'
        ? 'text-neo-cyan-dark'
        : revealed
          ? 'text-neo-purple'
          : 'text-neo-navy';

  return (
    <button
      type="button"
      role="gridcell"
      data-cell
      aria-label={label}
      aria-selected={isActive}
      onClick={() => onSelect(cell.row, cell.col)}
      className={`relative flex items-center justify-center font-neo-display font-extrabold uppercase select-none transition-[background-color,transform,box-shadow] duration-100 ${bg} ${text} ${
        isActive ? 'z-10 scale-[1.08] shadow-hard' : ''
      }`}
      style={{ gridColumn, gridRow, fontSize: 'min(6.4vw, 1.75rem)' }}
    >
      {cell.number != null && (
        <span
          className="absolute top-[1.5px] start-[2.5px] text-[0.56rem] leading-none font-neo-body font-bold text-neo-navy/55"
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

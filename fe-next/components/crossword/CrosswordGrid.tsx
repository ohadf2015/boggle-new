'use client';

import { useMemo } from 'react';
import { currentSlot, type GameState } from '@/lib/crossword/gameState';
import { CrosswordCell } from './CrosswordCell';

export interface CrosswordGridProps {
  state: GameState;
  onSelect: (row: number, col: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function CrosswordGrid({ state, onSelect, t }: CrosswordGridProps) {
  const { puzzle, active, checks, revealed } = state;
  const size = puzzle.size;

  const slot = currentSlot(state);
  const activeSlotCells = useMemo(
    () => new Set((slot?.cells ?? []).map((c) => `${c.row},${c.col}`)),
    [slot],
  );
  // Cells that are the last letter of any word (for Hebrew sofit rendering).
  const wordEndCells = useMemo(() => {
    const s = new Set<string>();
    for (const sl of puzzle.slots) {
      const last = sl.cells[sl.cells.length - 1];
      if (last) s.add(`${last.row},${last.col}`);
    }
    return s;
  }, [puzzle.slots]);

  return (
    <div
      role="grid"
      aria-label={t('crossword.gridLabel')}
      dir={puzzle.rtl ? 'rtl' : 'ltr'}
      className="grid gap-[3px] mx-auto w-full max-w-[min(92vw,30rem)] aspect-square bg-black p-[3px] rounded-neo shadow-hard-lg"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
      }}
    >
      {puzzle.cells.map((cell) => {
        const key = `${cell.row},${cell.col}`;
        return (
          <CrosswordCell
            key={key}
            cell={cell}
            letter={state.entries[key] ?? ''}
            size={size}
            rtl={puzzle.rtl}
            locale={puzzle.locale}
            isActive={active.row === cell.row && active.col === cell.col}
            inActiveSlot={activeSlotCells.has(key)}
            isWordEnd={wordEndCells.has(key)}
            check={checks[key]}
            revealed={revealed.includes(key)}
            onSelect={onSelect}
            label={t('crossword.cellLabel', { row: cell.row + 1, col: cell.col + 1 })}
          />
        );
      })}
    </div>
  );
}

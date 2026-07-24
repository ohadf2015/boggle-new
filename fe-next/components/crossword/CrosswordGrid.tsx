'use client';

import { useEffect, useMemo, useRef } from 'react';
import { currentSlot, type GameState } from '@/lib/crossword/gameState';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CrosswordCell } from './CrosswordCell';

export interface CrosswordGridProps {
  state: GameState;
  onSelect: (row: number, col: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  solved?: boolean;
  /** Slot IDs that just got solved — brief glow on their cells. */
  wordSolvedSlots?: string[];
}

export function CrosswordGrid({ state, onSelect, t, solved = false, wordSolvedSlots = [] }: CrosswordGridProps) {
  const { puzzle, active, checks, revealed, warmths } = state;
  const size = puzzle.size;
  const reduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  const diffShadow =
    ({ easy: 'shadow-hard-lime', medium: 'shadow-hard-cyan', hard: 'shadow-hard-pink' } as const)[
      puzzle.difficulty
    ] ?? 'shadow-hard-lg';

  const slot = currentSlot(state);
  const activeSlotCells = useMemo(
    () => new Set((slot?.cells ?? []).map((c) => `${c.row},${c.col}`)),
    [slot],
  );
  const wordEndCells = useMemo(() => {
    const s = new Set<string>();
    for (const sl of puzzle.slots) {
      const last = sl.cells[sl.cells.length - 1];
      if (last) s.add(`${last.row},${last.col}`);
    }
    return s;
  }, [puzzle.slots]);

  // Build set of cells in recently solved slots (for glow animation)
  const solvedCells = useMemo(() => {
    const s = new Set<string>();
    if (wordSolvedSlots.length === 0) return s;
    for (const slotId of wordSolvedSlots) {
      const sl = puzzle.slots.find((x) => x.id === slotId);
      if (sl) for (const c of sl.cells) s.add(`${c.row},${c.col}`);
    }
    return s;
  }, [wordSolvedSlots, puzzle.slots]);

  const mid = (size - 1) / 2;
  const enterDelay = (row: number, col: number): number => {
    const dist = Math.abs(row - mid) + Math.abs(col - mid);
    return Math.min(dist, 6) * 0.045;
  };

  useEffect(() => {
    if (!solved || reduced || !gridRef.current) return;
    let ctx: { revert: () => void } | null = null;
    (async () => {
      const gsap = (await import('gsap')).default;
      if (!gridRef.current) return;
      ctx = gsap.context(() => {
        gsap.fromTo(
          '[data-letter]',
          { scale: 1 },
          {
            scale: 1.35,
            duration: 0.3,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
            stagger: { each: 0.04, from: 'start', grid: 'auto' },
          },
        );
      }, gridRef);
    })();
    return () => ctx?.revert();
  }, [solved, reduced]);

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={t('crossword.gridLabel')}
      dir={puzzle.rtl ? 'rtl' : 'ltr'}
      className={`grid gap-px mx-auto w-full max-w-[min(92vw,28rem)] aspect-square bg-black p-px rounded-none ${diffShadow} border-[3px] border-black`}
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
            warmth={warmths[key]}
            revealed={revealed.includes(key)}
            onSelect={onSelect}
            label={t('crossword.cellLabel', { row: cell.row + 1, col: cell.col + 1 })}
            enter={!reduced}
            enterDelay={enterDelay(cell.row, cell.col)}
            solvedGlow={solvedCells.has(key) && !reduced}
          />
        );
      })}
    </div>
  );
}
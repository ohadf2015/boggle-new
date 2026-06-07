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
}

export function CrosswordGrid({ state, onSelect, t, solved = false }: CrosswordGridProps) {
  const { puzzle, active, checks, revealed } = state;
  const size = puzzle.size;
  const reduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

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

  // GSAP entrance: letter tiles pop in from the center on mount. Reduced-motion → no-op.
  useEffect(() => {
    if (reduced || !gridRef.current) return;
    let ctx: { revert: () => void } | null = null;
    (async () => {
      const gsap = (await import('gsap')).default;
      if (!gridRef.current) return;
      ctx = gsap.context(() => {
        gsap.from('[data-cell]', {
          scale: 0.4,
          autoAlpha: 0,
          duration: 0.45,
          ease: 'back.out(1.7)',
          stagger: { each: 0.018, from: 'center', grid: 'auto' },
        });
      }, gridRef);
    })();
    return () => ctx?.revert();
  }, [reduced, puzzle.id]);

  // GSAP solved cascade: a celebratory ripple across the solved board.
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
      className="grid gap-[3px] mx-auto w-full max-w-[min(92vw,30rem)] aspect-square bg-black p-[3px] rounded-neo shadow-hard-lg border-[3px] border-black"
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

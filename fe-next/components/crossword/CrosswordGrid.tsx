'use client';

import { useEffect, useMemo, useRef } from 'react';
import { currentSlot, type GameState } from '@/lib/crossword/gameState';
import { solvedSlotIds } from '@/lib/crossword/stats';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CrosswordCell } from './CrosswordCell';
import { useBoardPanZoom, ZOOM_STEP } from './useBoardPanZoom';
import { initialScale } from '@/lib/crossword/viewport';

export interface CrosswordGridProps {
  state: GameState;
  onSelect: (row: number, col: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  solved?: boolean;
}

export function CrosswordGrid({ state, onSelect, t, solved = false }: CrosswordGridProps) {
  const { puzzle, active, checks, revealed, warmths } = state;
  const size = puzzle.size;
  const reduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  // Difficulty reads at a glance from the grid's hard drop-shadow colour — same family as the
  // masthead difficulty chip (easy lime · medium cyan · hard pink). Black border stays (neo rule);
  // the colour lives in the shadow. Colored hard-shadows carry their own RTL flip variants.
  const diffShadow =
    ({ easy: 'shadow-hard-lime', medium: 'shadow-hard-cyan', hard: 'shadow-hard-pink' } as const)[
      puzzle.difficulty
    ] ?? 'shadow-hard-lg';

  // A mini always fits its box, so it gets neither pan nor zoom chrome.
  const zoomable = initialScale(size) > 1;
  const pan = useBoardPanZoom({ size, rtl: puzzle.rtl, active });

  const slot = currentSlot(state);
  const activeSlotCells = useMemo(
    () => new Set((slot?.cells ?? []).map((c) => `${c.row},${c.col}`)),
    [slot],
  );
  // Cells belonging to a word that is completely and correctly filled. The stat bar already
  // counts these ("3/10 words"), so the board was withholding information the HUD gave away —
  // players could see that three words were right but not which. Marking them makes filling the
  // board legible, and gives each finished word a visible payoff instead of only a sound.
  const solvedCells = useMemo(() => {
    const s = new Set<string>();
    for (const id of solvedSlotIds(state)) {
      const sl = puzzle.slots.find((x) => x.id === id);
      for (const c of sl?.cells ?? []) s.add(`${c.row},${c.col}`);
    }
    return s;
  }, [state, puzzle.slots]);

  // Cells that end EVERY word running through them (for Hebrew sofit rendering).
  //
  // Every white cell in a doubly-checked grid belongs to both an across and a down answer, and one
  // glyph has to serve both readings. A final form is only correct where the letter genuinely ends
  // the word — so "ends ANY word" is wrong: a cell finishing the across answer while sitting
  // mid-down would print a sofit inside the down answer (יום crossing שמש renders ש-ם-ש, which is
  // not Hebrew). Requiring it to end ALL of its words keeps the sofit at true corners and leaves
  // the regular form everywhere it is contested — which is also how Israeli newspapers print.
  const wordEndCells = useMemo(() => {
    const through = new Map<string, number>();
    const ending = new Map<string, number>();
    for (const sl of puzzle.slots) {
      sl.cells.forEach((c, i) => {
        const key = `${c.row},${c.col}`;
        through.set(key, (through.get(key) ?? 0) + 1);
        if (i === sl.cells.length - 1) ending.set(key, (ending.get(key) ?? 0) + 1);
      });
    }
    const s = new Set<string>();
    for (const [key, ends] of ending) if (ends === through.get(key)) s.add(key);
    return s;
  }, [puzzle.slots]);

  // Entrance is CSS (see .cw-cell-enter): a staggered pop driven by per-cell animation-delay.
  // CSS is used deliberately over GSAP here — a CSS animation always resolves to its final
  // (visible) state and survives React re-renders, so cells can never get stuck hidden.
  // Center of the grid, for a center-out stagger.
  const mid = (size - 1) / 2;
  const enterDelay = (row: number, col: number): number => {
    const dist = Math.abs(row - mid) + Math.abs(col - mid);
    return Math.min(dist, 6) * 0.045;
  };

  // GSAP solved cascade: a celebratory ripple across the solved board. Safe — by the time the
  // puzzle is solved every cell is already visible, so there is no stuck-hidden risk.
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

  // The board must never be clipped. On mobile the parent is a size-query container, so
  // 100cqmin resolves to the smaller of the space actually left over after the pinned chrome.
  // Sizing off width alone (the old `92vw`) overflowed the scrollport on short phones.
  // Desktop has no bounded height, so it falls back to plain width sizing.
  //
  // The clip box's LAYOUT size is what the old fix pinned down, so zoom is expressed purely as a
  // transform on the layer inside it: the grid can never grow past its box and re-create the
  // clipping bug, however far you pinch.
  return (
    <div
      ref={pan.viewportRef}
      data-crossword-board
      className={`relative m-auto aspect-square w-[min(100cqmin,28rem)] lg:w-full lg:max-w-[28rem] overflow-hidden touch-none select-none bg-black ${diffShadow} border-[3px] border-black`}
      onPointerDown={pan.onPointerDown}
      onPointerMove={pan.onPointerMove}
      onPointerUp={pan.onPointerUp}
      onPointerCancel={pan.onPointerUp}
      onClickCapture={pan.onClickCapture}
      data-pannable={pan.pannable ? 'true' : 'false'}
      style={{ cursor: pan.pannable ? 'grab' : undefined }}
    >
      <div
        ref={pan.contentRef}
        className="absolute inset-0 will-change-transform"
        style={{ transformOrigin: '0 0' }}
      >
        <div
          ref={gridRef}
          role="grid"
          aria-label={t('crossword.gridLabel')}
          dir={puzzle.rtl ? 'rtl' : 'ltr'}
          className="grid gap-px h-full w-full bg-black p-px"
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
                locale={puzzle.locale}
                isActive={active.row === cell.row && active.col === cell.col}
                inActiveSlot={activeSlotCells.has(key)}
                isWordEnd={wordEndCells.has(key)}
                inSolvedSlot={solvedCells.has(key)}
                check={checks[key]}
                warmth={warmths[key]}
                revealed={revealed.includes(key)}
                onSelect={onSelect}
                label={t('crossword.cellLabel', { row: cell.row + 1, col: cell.col + 1 })}
                enter={!reduced}
                enterDelay={enterDelay(cell.row, cell.col)}
              />
            );
          })}
        </div>
      </div>

      {/* Zoom affordance for pointer/keyboard users — pinch is touch-only, and a grid this size
          has to be reachable without one. Hidden entirely on a grid that always fits. */}
      {zoomable && (
        <div className="absolute bottom-1 end-1 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => pan.zoomBy(ZOOM_STEP)}
            disabled={!pan.canZoomIn}
            aria-label={t('crossword.zoomIn')}
            className="h-8 w-8 grid place-items-center rounded-neo border-neo border-black bg-neo-cream text-black font-neo-display text-lg leading-none shadow-hard-sm disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => pan.zoomBy(-ZOOM_STEP)}
            disabled={!pan.canZoomOut}
            aria-label={t('crossword.zoomOut')}
            className="h-8 w-8 grid place-items-center rounded-neo border-neo border-black bg-neo-cream text-black font-neo-display text-lg leading-none shadow-hard-sm disabled:opacity-40"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}

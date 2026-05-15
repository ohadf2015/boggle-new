'use client';
import { useRef, useCallback, useEffect } from 'react';
import { LayoutGroup, AnimatePresence, m } from 'framer-motion';
import type { BlastLevel, CellId } from '@/lib/blast/v2/types';
import { cellId as makeCellId, type SelectionState, type AlmostWord } from '@/lib/blast/v2/engine';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import { BlastTile, type BlastTileState } from './BlastTile';
import { BlastSelectionPath } from './BlastSelectionPath';
import { BlastAlmostGhost } from './BlastAlmostGhost';
import { useCollapseTimeline } from './useCollapseTimeline';
import styles from './BlastTile.module.css';

type Props = {
  level: BlastLevel;
  selection: SelectionState;
  invalidShakeKey: number;
  onPointerDown: (cell: CellId) => void;
  onPointerEnter: (cell: CellId) => void;
  onPointerUp: () => void;
  modeColor?: string;
  almosts?: AlmostWord[];
  tileIds: string[][];
  revealGlowCells?: CellId[];
  onCommitSelection?: (centers: Array<{ x: number; y: number }>) => void;
};

export function BlastBoard({
  level,
  selection,
  invalidShakeKey,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
  modeColor = '#ec4899',
  almosts,
  tileIds,
  revealGlowCells = [],
  onCommitSelection,
}: Props) {
  const config = LOCALE_CONFIGS[level.locale];
  const boardRef = useRef<HTMLDivElement>(null);
  const selectedSet = selection.kind === 'active' ? new Set(selection.cells) : new Set<CellId>();
  const revealGlowSet = new Set(revealGlowCells);

  useCollapseTimeline(boardRef, tileIds);

  // Board-relative center — used by BlastSelectionPath (SVG inside board).
  const getCellCenter = useCallback((id: CellId) => {
    const board = boardRef.current;
    if (!board) return null;
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
  }, []);

  // Viewport-absolute center — fed to BlastFxOverlay, which subtracts its
  // own canvas rect. Decouples FX positioning from board layout/scroll.
  const getCellViewportCenter = useCallback((id: CellId) => {
    const board = boardRef.current;
    if (!board) return null;
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  const tileState = (id: CellId): BlastTileState => (selectedSet.has(id) ? 'selected' : 'normal');
  const dir = config.rtl ? 'rtl' : 'ltr';

  // Window-level pointermove + elementFromPoint hit-test.
  // Per-tile onPointerEnter does NOT fire on touch (Capacitor WKWebView
  // implicit-capture); window-level pointermove with hit-test is the
  // only mobile-safe way to track drag across siblings.
  const isDragging = selection.kind === 'active' && selection.mode === 'drag';
  const lastEnterRef = useRef<CellId | null>(null);
  useEffect(() => {
    if (!isDragging) {
      lastEnterRef.current = null;
      return;
    }
    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const tile = el instanceof Element ? el.closest('[data-cell-id]') : null;
      if (tile instanceof HTMLElement) {
        const id = tile.dataset.cellId as CellId | undefined;
        if (id && id !== lastEnterRef.current) {
          lastEnterRef.current = id;
          onPointerEnter(id);
        }
      }
    };
    const onUp = () => {
      lastEnterRef.current = null;
      // Report cleared cell centers before calling onPointerUp
      if (selection.kind === 'active' && onCommitSelection) {
        const centers = selection.cells
          .map((cell) => getCellViewportCenter(cell))
          .filter((c): c is { x: number; y: number } => c !== null);
        if (centers.length > 0) {
          onCommitSelection(centers);
        }
      }
      onPointerUp();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, onPointerEnter, onPointerUp, selection, onCommitSelection, getCellViewportCenter]);

  return (
    <div
      ref={boardRef}
      dir={dir}
      data-shake-key={invalidShakeKey}
      data-testid="blast-board"
      className={`relative flex items-end justify-center gap-2 p-4 touch-none select-none ${styles.board}`}
      style={{ touchAction: 'none' }}
      onPointerUp={onPointerUp}
    >
      {/* Cell-well backdrop — empty inset slots line up perfectly with tile
          positions. Reads as a real game board, not floating stickers. */}
      <div aria-hidden className="absolute inset-0 flex items-end justify-center gap-2 p-4 pointer-events-none">
        {level.columns.map((col) => (
          <div key={`well-${col.index}`} className="flex flex-col-reverse gap-2">
            {col.tiles.map((_, row) => (
              <div key={`well-${col.index}-${row}`} className={styles.cellWell} />
            ))}
          </div>
        ))}
      </div>
      <LayoutGroup>
        {level.columns.map((col, c) => (
          <div key={col.index} className="flex flex-col-reverse gap-2 relative" data-col={col.index}>
            <AnimatePresence>
              {col.tiles.map((letter, row) => {
                const id = makeCellId(col.index, row);
                const flags = level.tileFlags[id] ?? [];
                const tileKey = tileIds[c]?.[row] ?? id;
                const hasRevealGlow = revealGlowSet.has(id);
                // Framer's LayoutGroup tracks the keyed child — promoting
                // this wrapper to <m.div layout> is what makes tiles SLIDE
                // into their new positions after a collapse (gravity).
                return (
                  <m.div
                    key={tileKey}
                    layout
                    // Bouncier spring: lower stiffness + damping → overshoot
                    // on land so tiles "settle" instead of snapping into place.
                    transition={{ type: 'spring', stiffness: 420, damping: 22, mass: 1.05, restDelta: 0.5 }}
                    className="relative"
                  >
                    <BlastTile
                      cellId={id}
                      letter={letter}
                      flags={flags}
                      state={tileState(id)}
                      modeColor={modeColor}
                      fontStack={config.fontStack}
                      paddingExtra={config.tileExtraPadding}
                      onPointerDown={() => onPointerDown(id)}
                    />
                    {hasRevealGlow && (
                      <span data-reveal-glow className={styles.revealGlow} />
                    )}
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </LayoutGroup>
      <BlastSelectionPath
        cells={selection.kind === 'active' ? selection.cells : []}
        getCellCenter={getCellCenter}
        color={modeColor}
      />
      <BlastAlmostGhost
        almosts={almosts ?? []}
        hidden={selection.kind === 'active'}
        modeColor={modeColor}
        boardRef={boardRef}
      />
    </div>
  );
}

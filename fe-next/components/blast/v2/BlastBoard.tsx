'use client';
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { LayoutGroup, AnimatePresence, m } from 'framer-motion';
import type { BlastLevel, CellId } from '@/lib/blast/v2/types';
import { cellId as makeCellId, type SelectionState, type AlmostWord } from '@/lib/blast/v2/engine';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import { BlastTile, type BlastTileState } from './BlastTile';
import { BlastSelectionPath } from './BlastSelectionPath';
import { BlastAlmostGhost } from './BlastAlmostGhost';
import { useCollapseTimeline } from './useCollapseTimeline';
import { useInvalidShake } from './useInvalidShake';
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
  /**
   * Stable count of cellWell rows to render per column. Anchored at the
   * level's initial max row height so the play area doesn't shrink as
   * tiles are cleared — board stays visually consistent.
   */
  boardRows: number;
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
  boardRows,
}: Props) {
  const config = LOCALE_CONFIGS[level.locale];
  const boardRef = useRef<HTMLDivElement>(null);
  const selectedSet = selection.kind === 'active' ? new Set(selection.cells) : new Set<CellId>();
  const revealGlowSet = new Set(revealGlowCells);

  useCollapseTimeline(boardRef, tileIds);
  useInvalidShake(boardRef, invalidShakeKey);

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

  // Cellwell row count: anchored at the level's tallest column at start so
  // the board doesn't shrink as words clear. min(boardRows, current max) so
  // we never shrink BELOW current tile heights either.
  const visualRows = useMemo(() => {
    const currentMax = Math.max(1, ...level.columns.map((c) => c.tiles.length));
    return Math.max(boardRows, currentMax);
  }, [boardRows, level.columns]);

  return (
    <div
      ref={boardRef}
      dir={dir}
      data-shake-key={invalidShakeKey}
      data-testid="blast-board"
      data-board-rows={visualRows}
      className={`relative flex items-end justify-center gap-2 p-4 touch-none select-none w-full h-full ${styles.board}`}
      style={{
        touchAction: 'none',
        // Drives container-query tile sizing: every tile reads
        // --blast-tile-size derived from both column AND row counts so the
        // board fills the available box on both axes (no more 3:1 wide-short
        // strip when only 2 rows remain).
        ['--blast-cols' as string]: String(level.columns.length),
        ['--blast-rows' as string]: String(visualRows),
      }}
      onPointerUp={onPointerUp}
    >
      {/* Cell-well backdrop — empty inset slots line up with tile positions.
          Renders a FIXED `visualRows` wells per column so the board stays the
          same size as tiles are cleared (Royal-Match style stable playfield). */}
      <div aria-hidden className="absolute inset-0 flex items-end justify-center gap-2 p-4 pointer-events-none">
        {level.columns.map((col) => (
          <div key={`well-${col.index}`} className="flex flex-col-reverse gap-2">
            {Array.from({ length: visualRows }).map((_, row) => (
              <div key={`well-${col.index}-${row}`} className={styles.cellWell} />
            ))}
          </div>
        ))}
      </div>
      <LayoutGroup>
        {level.columns.map((col, c) => (
          <div
            key={col.index}
            className={`flex flex-col-reverse gap-2 relative ${styles.tileColumn}`}
            data-col={col.index}
          >
            <AnimatePresence>
              {col.tiles.map((letter, row) => {
                const id = makeCellId(col.index, row);
                const flags = level.tileFlags[id] ?? [];
                const tileKey = tileIds[c]?.[row] ?? id;
                const hasRevealGlow = revealGlowSet.has(id);
                // Framer's LayoutGroup tracks the keyed child — promoting
                // this wrapper to <m.div layout> is what makes tiles SLIDE
                // into their new positions after a collapse (gravity).
                // `layout="position"` locks size animation off; only x/y
                // animate, so tiles never inflate horizontally as a side
                // effect of size measurement and the visual axis stays Y.
                return (
                  <m.div
                    key={tileKey}
                    layout="position"
                    // Critically-damped fall — playtest feedback was tiles
                    // bouncing too much on landing. damping was 32 against
                    // stiffness 720 mass 1.6, well below critical (2·√(720·1.6)
                    // ≈ 68). Bumped damping 32→62 so tiles arrive without
                    // visible overshoot; the landing punch still reads via
                    // the squash timeline (useCollapseTimeline).
                    transition={{ type: 'spring', stiffness: 720, damping: 62, mass: 1.6, restDelta: 0.4 }}
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

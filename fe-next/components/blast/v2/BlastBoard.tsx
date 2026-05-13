'use client';
import { useRef, useCallback } from 'react';
import { LayoutGroup, AnimatePresence } from 'framer-motion';
import type { BlastLevel, CellId } from '@/lib/blast/v2/types';
import { cellId as makeCellId, type SelectionState } from '@/lib/blast/v2/engine';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import { BlastTile, type BlastTileState } from './BlastTile';
import { BlastSelectionPath } from './BlastSelectionPath';

type Props = {
  level: BlastLevel;
  selection: SelectionState;
  invalidShakeKey: number;
  onPointerDown: (cell: CellId) => void;
  onPointerEnter: (cell: CellId) => void;
  onPointerUp: () => void;
  modeColor?: string;
};

export function BlastBoard({
  level,
  selection,
  invalidShakeKey,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
  modeColor = '#ec4899',
}: Props) {
  const config = LOCALE_CONFIGS[level.locale];
  const boardRef = useRef<HTMLDivElement>(null);
  const selectedSet = selection.kind === 'active' ? new Set(selection.cells) : new Set<CellId>();

  const getCellCenter = useCallback((id: CellId) => {
    const board = boardRef.current;
    if (!board) return null;
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
  }, []);

  const tileState = (id: CellId): BlastTileState => (selectedSet.has(id) ? 'selected' : 'normal');
  const dir = config.rtl ? 'rtl' : 'ltr';

  const lastEnteredRef = useRef<CellId | null>(null);
  const selectionMode = selection.kind === 'active' ? selection.mode : null;
  const handleBoardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (selectionMode !== 'drag') return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const tileEl = (el as HTMLElement).closest('[data-cell-id]') as HTMLElement | null;
      if (!tileEl) return;
      const id = tileEl.getAttribute('data-cell-id') as CellId | null;
      if (!id) return;
      if (lastEnteredRef.current === id) return;
      lastEnteredRef.current = id;
      onPointerEnter(id);
    },
    [selectionMode, onPointerEnter]
  );

  const handleTilePointerDown = useCallback(
    (id: CellId, e: React.PointerEvent<HTMLDivElement>) => {
      // Release implicit pointer capture so board-level pointermove + elementFromPoint
      // can route drag to sibling tiles (touch devices capture by default).
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore — capture release is best-effort */
      }
      lastEnteredRef.current = id;
      onPointerDown(id);
    },
    [onPointerDown]
  );

  return (
    <div
      ref={boardRef}
      dir={dir}
      data-shake-key={invalidShakeKey}
      data-testid="blast-board"
      className="relative flex items-end justify-center gap-2 p-4 touch-none"
      onPointerUp={onPointerUp}
      onPointerMove={handleBoardPointerMove}
    >
      <LayoutGroup>
        {level.columns.map((col) => (
          <div key={col.index} className="flex flex-col-reverse gap-2" data-col={col.index}>
            <AnimatePresence>
              {col.tiles.map((letter, row) => {
                const id = makeCellId(col.index, row);
                const flags = level.tileFlags[id] ?? [];
                return (
                  <BlastTile
                    key={id}
                    cellId={id}
                    letter={letter}
                    displayChar={config.displayChar(letter, row, col.tiles.length)}
                    flags={flags}
                    state={tileState(id)}
                    modeColor={modeColor}
                    fontStack={config.fontStack}
                    onPointerDown={(e) => handleTilePointerDown(id, e)}
                  />
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
    </div>
  );
}

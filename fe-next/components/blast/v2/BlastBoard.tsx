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

  return (
    <div
      ref={boardRef}
      dir={dir}
      data-shake-key={invalidShakeKey}
      data-testid="blast-board"
      className="relative flex items-end justify-center gap-2 p-4"
      onPointerUp={onPointerUp}
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
                    paddingExtra={config.tileExtraPadding}
                    onPointerDown={() => onPointerDown(id)}
                    onPointerEnter={() => selection.kind === 'active' && selection.mode === 'drag' && onPointerEnter(id)}
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

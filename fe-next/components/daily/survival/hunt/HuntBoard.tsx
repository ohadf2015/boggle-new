'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGridInteraction } from '@/components/grid/useGridInteraction';
import { shouldShowDoubleClickSubmitHint } from '@/components/grid/submitHintVisibility';
import type { SelectedCell } from '@/components/grid/types';
import type { LetterGrid } from '@/types';
import { cellCentre, trailPath, CELL_UNIT } from './huntTrail';
import type { HuntCell, HuntPhase, HuntVerdict } from './huntStage';
import styles from './HuntBoard.module.css';

type TFn = (key: string, fallback?: string) => string;

export interface HuntBoardProps {
  grid: LetterGrid;
  interactive: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  onLive: (word: string) => void;
  onRelease: (word: string, path: HuntCell[]) => void;
  phase: HuntPhase;
  verdict: HuntVerdict | null;
  heldPath: HuntCell[];
  bubble?: string | null;
  calm: boolean;
  size?: 'phone' | 'desktop';
  t: TFn;
}

export const HUNT_IDLE_SUBMIT_MS = 2000;

const cellStyle = (idx: number | undefined, r: number, c: number) =>
  ({ '--i': idx ?? 0, '--tilt': `${(r + c) % 2 ? 3 : -3}deg` }) as React.CSSProperties;

const key = (c: HuntCell) => `${c.row},${c.col}`;

function lengthTier(n: number): 1 | 2 | 3 {
  if (n >= 7) return 3;
  if (n >= 5) return 2;
  return 1;
}

function useCanHover() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
      setCanHover(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    } catch {
      return undefined;
    }
  }, []);
  return canHover;
}

export function HuntBoard({
  grid,
  interactive,
  eliminatedLetters,
  onWordSubmit,
  onWordChange,
  onLive,
  onRelease,
  phase,
  verdict,
  heldPath,
  bubble,
  calm,
  size = 'phone',
  t,
}: HuntBoardProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<HuntCell[]>([]);
  const canHover = useCanHover();

  const handlePathSubmit = useCallback((cells: SelectedCell[]) => {
    pathRef.current = cells.map((c) => ({ row: c.row, col: c.col }));
  }, []);
  const handleSubmit = useCallback(
    (word: string) => {
      onRelease(word, pathRef.current);
      onWordSubmit(word);
    },
    [onRelease, onWordSubmit],
  );

  const {
    selectedCells,
    isSelecting,
    handleTouchStart,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleRightClick,
    handleDoubleClick,
    handleKeyDown,
  } = useGridInteraction({
    grid,
    interactive,
    comboLevel: 0,
    onWordSubmit: handleSubmit,
    onPathSubmit: handlePathSubmit,
    gridRef,
    disableLetterKeyInput: true,
    autoSubmitIdleMs: HUNT_IDLE_SUBMIT_MS,
  });

  const word = useMemo(() => selectedCells.map((c) => c.letter).join(''), [selectedCells]);
  useEffect(() => {
    onWordChange(word, word ? selectedCells.length : 0);
    onLive(word);
    // Only a change of the formed word is news; callbacks are stable upstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  const holding = phase === 'pending' || phase === 'verdict';
  const shown: HuntCell[] = holding ? heldPath : selectedCells;
  const kind = holding ? 'held' : selectedCells.length ? 'sel' : null;

  const order = useMemo(() => new Map(shown.map((c, i) => [key(c), i])), [shown]);
  const tip = shown.length ? shown[shown.length - 1] : null;
  const cols = grid[0]?.length ?? 0;
  const rows = grid.length;

  const onCellTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      handleTouchStart(Number(el.dataset.row), Number(el.dataset.col), el.dataset.letter || '', e);
    },
    [handleTouchStart],
  );
  const onCellMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      handleMouseDown(Number(el.dataset.row), Number(el.dataset.col), el.dataset.letter || '', e);
    },
    [handleMouseDown],
  );
  const onCellDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      handleDoubleClick(Number(el.dataset.row), Number(el.dataset.col));
    },
    [handleDoubleClick],
  );

  const tipPos = tip ? cellCentre(tip) : null;

  return (
    <div className={styles.wrap} data-size={size} data-calm={calm ? 'true' : 'false'}>
      <div
        ref={gridRef}
        role="grid"
        aria-label={t('wordHunt.survival.stage.boardLabel')}
        dir="ltr"
        tabIndex={interactive ? 0 : -1}
        data-phase={phase}
        data-verdict={holding && verdict ? verdict : undefined}
        data-tier={lengthTier(shown.length)}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleRightClick}
        onKeyDown={handleKeyDown}
        className={styles.tray}
        style={{ '--cols': cols, '--rows': rows } as React.CSSProperties}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const idx = order.get(`${r},${c}`);
            const isTip = tip?.row === r && tip?.col === c;
            const eliminated = eliminatedLetters.has(String(letter).toUpperCase());
            return (
              <div
                key={`${r},${c}`}
                role="gridcell"
                aria-label={String(letter)}
                aria-selected={idx !== undefined}
                data-row={r}
                data-col={c}
                data-letter={letter}
                data-state={idx !== undefined && kind ? kind : undefined}
                data-tip={isTip && kind === 'sel' ? 'true' : undefined}
                data-eliminated={eliminated ? 'true' : undefined}
                onTouchStart={interactive ? onCellTouchStart : undefined}
                onMouseDown={interactive ? onCellMouseDown : undefined}
                onDoubleClick={interactive ? onCellDoubleClick : undefined}
                className={styles.tile}
                style={cellStyle(idx, r, c)}
              >
                <span className={styles.face} />
              </div>
            );
          }),
        )}
        <div className={styles.layer} aria-hidden="true">
        {shown.length > 0 && (
          <svg
            aria-hidden="true"
            data-testid="hunt-trail"
            data-kind={kind ?? undefined}
            className={styles.trail}
            viewBox={`0 0 ${cols * CELL_UNIT} ${rows * CELL_UNIT}`}
          >
            <path className={styles.ribbonEdge} d={trailPath(shown)} />
            <path className={styles.ribbon} d={trailPath(shown)} />
            <path className={styles.stitch} d={trailPath(shown)} />
            <circle className={styles.cap} cx={cellCentre(shown[0]).x} cy={cellCentre(shown[0]).y} r={17} />
            {tipPos && shown.length > 1 && <circle className={styles.tipDot} cx={tipPos.x} cy={tipPos.y} r={10} />}
          </svg>
        )}
        </div>
        <div className={styles.glyphs} aria-hidden="true">
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const idx = order.get(`${r},${c}`);
              const isTip = tip?.row === r && tip?.col === c;
              return (
                <span
                  key={`${r},${c}`}
                  className={styles.glyph}
                  data-state={idx !== undefined && kind ? kind : undefined}
                  data-tip={isTip && kind === 'sel' ? 'true' : undefined}
                  data-eliminated={eliminatedLetters.has(String(letter).toUpperCase()) ? 'true' : undefined}
                  style={cellStyle(idx, r, c)}
                >
                  <span className={styles.ch}>{letter}</span>
                </span>
              );
            }),
          )}
        </div>
        <div className={`${styles.layer} ${styles.layerTop}`} aria-hidden="true">
        {holding && verdict && bubble && tipPos && (
          <span
            key={`${verdict}-${bubble}-${tipPos.x}-${tipPos.y}`}
            className={styles.bubble}
            data-testid="hunt-board-bubble"
            style={{ left: `${(tipPos.x / (cols * CELL_UNIT)) * 100}%`, top: `${(tipPos.y / (rows * CELL_UNIT)) * 100}%` }}
          >
            {bubble}
          </span>
        )}
        </div>
      </div>
      {interactive && shouldShowDoubleClickSubmitHint({ canHover, isClickSelecting: isSelecting, selectedCount: selectedCells.length }) && (
        <div data-testid="grid-doubleclick-submit-hint" role="status" aria-live="polite" className={styles.submitHint}>
          {t('game.doubleClickToSubmit', 'Double-click last letter to submit')}
        </div>
      )}
    </div>
  );
}

export default HuntBoard;

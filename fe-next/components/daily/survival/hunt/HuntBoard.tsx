'use client';

import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useBoardSelection } from '@/components/board/useBoardSelection';
import type { CellRef } from '@/components/board/selectionPath';
import type { LetterGrid } from '@/types';
import { useLargeLetters } from '@/contexts/AccessibilityContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cellCentre, trailPath, CELL_UNIT } from './huntTrail';
import type { HuntCell, HuntPhase, HuntVerdict } from './huntStage';
import styles from './HuntBoard.module.css';

type TFn = (key: string, fallbackOrParams?: string | Record<string, string | number>) => string;

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
  calm: boolean;
  size?: 'phone' | 'desktop';
  t: TFn;
}

export const HUNT_IDLE_SUBMIT_MS = 2000;
const RUBBER_MAX = 40;
const RUBBER_MIN = 14;

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
  calm,
  size = 'phone',
  t,
}: HuntBoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const rubberRef = useRef<SVGLineElement>(null);
  const boxRef = useRef<DOMRect | null>(null);
  const canHover = useCanHover();
  const largeLetters = useLargeLetters();
  const { playTileSelectSound } = useSoundEffects();
  const [selectedCells, setSelectedCells] = useState<CellRef[]>([]);
  const [isClickSelecting, setIsClickSelecting] = useState(false);

  const selection = useBoardSelection(wrapRef, {
    interactive,
    autoSubmitIdleMs: HUNT_IDLE_SUBMIT_MS,
    onStep: () => playTileSelectSound?.(),
    onPathChange: (path) => {
      setSelectedCells(path);
      setIsClickSelecting(path.length > 0 && selection.current?.getMode() === 'click');
    },
    onSubmit: (path) => {
      const submitted = path.map((c) => c.letter).join('');
      onRelease(submitted, path.map((c) => ({ row: c.row, col: c.col })));
      onWordSubmit(submitted);
    },
  });

  const word = useMemo(() => selectedCells.map((c) => c.letter).join(''), [selectedCells]);
  useEffect(() => {
    // The whole game screen re-renders on these; keep them out of the frame that paints the tile.
    startTransition(() => {
      onWordChange(word, word ? selectedCells.length : 0);
      onLive(word);
    });
    // Only a change of the formed word is news; callbacks are stable upstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  // The shared engine only auto-submits at 3+ letters, so a 1-2 tile click would linger forever.
  useEffect(() => {
    if (selectedCells.length === 0 || selectedCells.length >= 3) return undefined;
    const id = window.setTimeout(() => {
      if (selection.current?.getMode() === 'click') selection.current.setPath([]);
    }, HUNT_IDLE_SUBMIT_MS);
    return () => window.clearTimeout(id);
  }, [selectedCells, selection]);

  const holding =(phase === 'pending' || phase === 'verdict') && selectedCells.length === 0;
  const shown: HuntCell[] = holding ? heldPath : selectedCells;
  const kind = holding ? 'held' : selectedCells.length ? 'sel' : null;

  const order = useMemo(() => new Map(shown.map((c, i) => [key(c), i])), [shown]);
  const tip = shown.length ? shown[shown.length - 1] : null;
  const cols = grid[0]?.length ?? 0;
  const rows = grid.length;

  const tipPos = tip ? cellCentre(tip) : null;

  const leanToward = (e: React.PointerEvent) => {
    const line = rubberRef.current;
    const box = (boxRef.current ??= layerRef.current?.getBoundingClientRect() ?? null);
    if (!line || !box || !tipPos || !box.width || !box.height) return;
    const dx = ((e.clientX - box.left) / box.width) * cols * CELL_UNIT - tipPos.x;
    const dy = ((e.clientY - box.top) / box.height) * rows * CELL_UNIT - tipPos.y;
    const len = Math.hypot(dx, dy);
    const k = len > RUBBER_MAX ? RUBBER_MAX / len : 1;
    line.setAttribute('x2', String(tipPos.x + dx * k));
    line.setAttribute('y2', String(tipPos.y + dy * k));
    line.style.opacity = len > RUBBER_MIN ? '1' : '0';
  };
  const pressedRef = useRef<HTMLElement | null>(null);
  const clearPress = () => {
    pressedRef.current?.removeAttribute('data-pressed');
    pressedRef.current = null;
  };
  // Lights the touched tile straight from the event, before the selection engine and React catch up.
  const pressTile = (e: React.PointerEvent) => {
    boxRef.current = null;
    if (!interactive) return;
    const tile = (e.target as Element | null)?.closest?.('[data-tile]') as HTMLElement | null;
    if (!tile) return;
    clearPress();
    tile.setAttribute('data-pressed', 'true');
    pressedRef.current = tile;
  };
  const dropLean = () => {
    clearPress();
    if (rubberRef.current) rubberRef.current.style.opacity = '0';
  };
  const boardSeed = grid.map((row) => row.join('')).join('|');
  // Labels follow the board, not the selection; t() is stable for the round.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cellLabels = useMemo(() => grid.map((row, r) => row.map((letter, c) => t('game.grid.cellLabel', { row: r + 1, col: c + 1, letter: String(letter) }))), [boardSeed]);

  return (
    <div ref={wrapRef} className={styles.wrap} data-size={size} data-calm={calm ? 'true' : 'false'} data-large={largeLetters ? 'true' : undefined}>
      <div
        role="grid"
        aria-label={t('wordHunt.survival.stage.boardLabel')}
        dir="ltr"
        tabIndex={interactive ? 0 : -1}
        data-phase={phase}
        data-verdict={holding && verdict ? verdict : undefined}
        data-tier={lengthTier(shown.length)}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={pressTile}
        onPointerMove={leanToward}
        onPointerUp={dropLean}
        onPointerCancel={dropLean}
        onPointerLeave={dropLean}
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
                aria-label={cellLabels[r]?.[c] ?? String(letter)}
                aria-selected={idx !== undefined}
                data-tile=""
                data-row={r}
                data-col={c}
                data-letter={letter}
                data-state={idx !== undefined && kind ? kind : undefined}
                data-tip={isTip && kind === 'sel' ? 'true' : undefined}
                data-eliminated={eliminated ? 'true' : undefined}
                className={styles.tile}
                style={cellStyle(idx, r, c)}
              >
                <span className={styles.face} />
              </div>
            );
          }),
        )}
        <div ref={layerRef} className={styles.layer} aria-hidden="true">
        {shown.length > 0 && (
          <svg
            aria-hidden="true"
            data-testid="hunt-trail"
            data-kind={kind ?? undefined}
            className={styles.trail}
            viewBox={`0 0 ${cols * CELL_UNIT} ${rows * CELL_UNIT}`}
          >
            <path className={styles.ribbonEdge} d={trailPath(shown.slice(0, -1))} />
            <path className={styles.ribbon} d={trailPath(shown.slice(0, -1))} />
            {shown.length > 1 && (
              <g key={shown.length}>
                <path className={`${styles.ribbonEdge} ${styles.lead}`} pathLength={1} d={trailPath(shown.slice(-2))} />
                <path className={`${styles.ribbon} ${styles.lead}`} pathLength={1} d={trailPath(shown.slice(-2))} />
                <path className={styles.spark} d={trailPath(shown.slice(-2))} />
              </g>
            )}
            <path className={styles.stitch} d={trailPath(shown)} />
            {kind === 'sel' && tipPos && (
              <line ref={rubberRef} className={styles.rubber} x1={tipPos.x} y1={tipPos.y} x2={tipPos.x} y2={tipPos.y} />
            )}
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
      </div>
      {interactive && canHover && isClickSelecting && selectedCells.length >= 2 && (
        <div data-testid="grid-doubleclick-submit-hint" role="status" aria-live="polite" className={styles.submitHint}>
          {t('game.doubleClickToSubmit', 'Double-click last letter to submit')}
        </div>
      )}
    </div>
  );
}

export default HuntBoard;

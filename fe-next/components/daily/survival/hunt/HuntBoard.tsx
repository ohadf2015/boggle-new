'use client';

import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useBoardSelection } from '@/components/board/useBoardSelection';
import { keyOf, type CellRef } from '@/components/board/selectionPath';
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
  onWordChange?: (word: string, count: number) => void;
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

const cellStyle = (idx: number | undefined, r: number, c: number) =>
  ({ '--i': idx ?? 0, '--tilt': `${(r + c) % 2 ? 3 : -3}deg` }) as React.CSSProperties;

const key = (c: HuntCell) => `${c.row},${c.col}`;

export function lengthTier(n: number): 1 | 2 | 3 {
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

/**
 * The live selection is painted onto these tiles by the shared board engine (the quick game's
 * mechanism), so a drag renders nothing in React. React only draws the released path while it
 * waits for, and then shows, its verdict.
 */
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
  const trayRef = useRef<HTMLDivElement>(null);
  const strayTimer = useRef(0);
  const canHover = useCanHover();
  const largeLetters = useLargeLetters();
  const { playTileSelectSound } = useSoundEffects();
  const [hasLive, setHasLive] = useState(false);
  const [clickHint, setClickHint] = useState(false);

  const selection = useBoardSelection(wrapRef, {
    interactive,
    autoSubmitIdleMs: HUNT_IDLE_SUBMIT_MS,
    onStep: () => playTileSelectSound?.(),
    onPathChange: (path: CellRef[]) => {
      trayRef.current?.setAttribute('data-live-tier', String(lengthTier(path.length)));
      const clicking = selection.current?.getMode() === 'click';
      setHasLive(path.length > 0);
      setClickHint(clicking && path.length >= 2);
      // The shared engine only auto-submits at 3+ letters, so a 1-2 tile click would linger forever.
      window.clearTimeout(strayTimer.current);
      if (path.length > 0 && path.length < 3) {
        strayTimer.current = window.setTimeout(() => {
          if (selection.current?.getMode() === 'click') selection.current.setPath([]);
        }, HUNT_IDLE_SUBMIT_MS);
      }
      const word = path.map((c) => c.letter).join('');
      // The whole game screen listens to these; keep them out of the frame that paints the tile.
      startTransition(() => {
        onWordChange?.(word, path.length);
        onLive(word);
      });
    },
    onSubmit: (path) => {
      const submitted = path.map((c) => c.letter).join('');
      onRelease(submitted, path.map((c) => ({ row: c.row, col: c.col })));
      onWordSubmit(submitted);
    },
  });

  useEffect(() => () => window.clearTimeout(strayTimer.current), []);

  useEffect(() => {
    if (!interactive && selection.current?.getPath().length) selection.current.setPath([]);
  }, [interactive, selection]);

  const holding = (phase === 'pending' || phase === 'verdict') && !hasLive;
  const shown: HuntCell[] = useMemo(() => (holding ? heldPath : []), [holding, heldPath]);

  const order = useMemo(() => new Map(shown.map((c, i) => [key(c), i])), [shown]);
  const cols = grid[0]?.length ?? 0;
  const rows = grid.length;

  const boardSeed = grid.map((row) => row.join('')).join('|');
  // Labels follow the board, not the selection; t() is stable for the round.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cellLabels = useMemo(() => grid.map((row, r) => row.map((letter, c) => t('game.grid.cellLabel', { row: r + 1, col: c + 1, letter: String(letter) }))), [boardSeed]);

  return (
    <div ref={wrapRef} className={styles.wrap} data-size={size} data-calm={calm ? 'true' : 'false'} data-large={largeLetters ? 'true' : undefined}>
      <div
        ref={trayRef}
        role="grid"
        aria-label={t('wordHunt.survival.stage.boardLabel')}
        dir="ltr"
        tabIndex={interactive ? 0 : -1}
        data-phase={phase}
        data-verdict={holding && verdict ? verdict : undefined}
        data-tier={lengthTier(shown.length)}
        onContextMenu={(e) => e.preventDefault()}
        className={styles.tray}
        style={{ '--cols': cols, '--rows': rows } as React.CSSProperties}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const idx = order.get(`${r},${c}`);
            const eliminated = eliminatedLetters.has(String(letter).toUpperCase());
            return (
              <div
                key={`${r},${c}`}
                role="gridcell"
                aria-label={cellLabels[r]?.[c] ?? String(letter)}
                data-tile=""
                data-key={keyOf(r, c)}
                data-row={r}
                data-col={c}
                data-letter={letter}
                data-state={idx !== undefined ? 'held' : undefined}
                data-eliminated={eliminated ? 'true' : undefined}
                className={styles.tile}
                style={cellStyle(idx, r, c)}
              >
                <span className={styles.face} />
              </div>
            );
          }),
        )}
        <svg data-board-trail="" className={styles.liveTrail} aria-hidden="true">
          <polyline data-trail="ink" />
          <polyline data-tail="ink" />
          <polyline data-trail="core" />
          <polyline data-tail="core" />
          <polyline data-trail="shine" />
          <circle data-finger="" data-off="" r="0" />
        </svg>
        <div className={styles.layer} aria-hidden="true">
          {shown.length > 0 && (
            <svg
              aria-hidden="true"
              data-testid="hunt-trail"
              data-kind="held"
              className={styles.trail}
              viewBox={`0 0 ${cols * CELL_UNIT} ${rows * CELL_UNIT}`}
            >
              <path className={styles.ribbonEdge} d={trailPath(shown)} />
              <path className={styles.ribbon} d={trailPath(shown)} />
              <path className={styles.stitch} d={trailPath(shown)} />
              <circle className={styles.cap} cx={cellCentre(shown[0]).x} cy={cellCentre(shown[0]).y} r={17} />
            </svg>
          )}
        </div>
        <div className={styles.glyphs} aria-hidden="true">
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const idx = order.get(`${r},${c}`);
              return (
                <span
                  key={`${r},${c}`}
                  data-gk={keyOf(r, c)}
                  className={styles.glyph}
                  data-state={idx !== undefined ? 'held' : undefined}
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
      {interactive && canHover && clickHint && (
        <div data-testid="grid-doubleclick-submit-hint" role="status" aria-live="polite" className={styles.submitHint}>
          {t('game.doubleClickToSubmit', 'Double-click last letter to submit')}
        </div>
      )}
    </div>
  );
}

export default HuntBoard;

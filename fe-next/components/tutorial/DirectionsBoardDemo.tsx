'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * The interactive centrepiece of the directions tutorial. A real 3×3 board the
 * player can drag across, wired to the exact same 8-direction adjacency the game
 * uses — so "you can go diagonally" is learned by DOING, not by reading.
 *
 * - A compass of 8 arrows radiates from the centre tile (the infographic) to
 *   spell out "any direction" at a glance; it fades once the player starts.
 * - The suggested word (C→A→T) sits on the main diagonal, so completing it is
 *   impossible without a diagonal move — the one thing new players miss.
 * - A looping animated hand demo plays first: it traces the diagonal twice, then
 *   shows a corner combination (C→A→T→S) to reinforce that diagonals can be
 *   chained with straight moves. After the demo the board becomes interactive.
 */

// Letters chosen so the main diagonal (indices 0,4,8) spells CAT, and index 5
// adds an S for the corner-combination demo (C→A→T→S).
const LETTERS = ['C', 'O', 'D', 'R', 'A', 'S', 'N', 'E', 'T'];
// The cells we visually invite the player to connect (top-left → centre → bottom-right).
const TARGET_PATH = [0, 4, 8];
// Extra step that turns the diagonal demo into a corner/zig-zag combination.
const COMBO_PATH = [0, 4, 8, 5];

// Demo playback configuration.
const DEMO_DIAGONAL_LOOPS = 2;
const DIAGONAL_DURATION = 1.6;
const COMBO_DURATION = 2;

// 8 compass directions, in degrees clockwise from "up".
const ARROW_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

type DemoPhase = 'diagonal' | 'combo' | 'interactive' | 'done';

function rowCol(i: number): [number, number] {
  return [Math.floor(i / 3), i % 3];
}

function isAdjacent(a: number, b: number): boolean {
  const [ar, ac] = rowCol(a);
  const [br, bc] = rowCol(b);
  const dr = Math.abs(ar - br);
  const dc = Math.abs(ac - bc);
  return dr <= 1 && dc <= 1 && dr + dc > 0;
}

function isDiagonalStep(a: number, b: number): boolean {
  const [ar, ac] = rowCol(a);
  const [br, bc] = rowCol(b);
  return Math.abs(ar - br) === 1 && Math.abs(ac - bc) === 1;
}

// Tile is 64px (h-16/w-16) with an 8px gap → 72px pitch, 32px half-tile.
// Centre of cell i in the board's own 208×208 coordinate space.
function cellCenter(i: number): { x: number; y: number } {
  const [r, c] = rowCol(i);
  return { x: c * 72 + 32, y: r * 72 + 32 };
}

function pointsAttr(path: number[]): string {
  return path.map((i) => { const p = cellCenter(i); return `${p.x},${p.y}`; }).join(' ');
}

function handKeyframes(path: number[]) {
  const centers = path.map(cellCenter);
  return {
    x: centers.map((p) => p.x),
    y: centers.map((p) => p.y),
  };
}

/** A traced path counts as "got it" once it makes a diagonal connection. */
export function pathProvesDiagonal(path: number[]): boolean {
  if (path.length < 3) return false;
  for (let i = 1; i < path.length; i++) {
    if (isDiagonalStep(path[i - 1], path[i])) return true;
  }
  return false;
}

export interface DirectionsBoardDemoProps {
  /** Fires once, the first time the player traces a diagonal-including path. */
  onTraced?: () => void;
}

function HandIcon() {
  // A simple pointing-hand SVG; the fingertip sits near the top of the viewBox
  // so a small negative margin aligns it with the centre of each tile.
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-14 w-14 drop-shadow-[2px_2px_0_#000]"
      style={{ marginLeft: -22, marginTop: -6 }}
      aria-hidden="true"
    >
      <path
        d="M15.5 3.5c-1.1 0-2 .9-2 2v8.5l-2.2-2.2c-.8-.8-2.1-.8-2.9 0-.8.8-.8 2.1 0 2.9l6.4 6.4c.9.9 2.1 1.3 3.3 1.1 1.5-.2 2.7-1.3 3-2.8l1.1-5.6c.3-1.4-.6-2.8-2-3.1-.5-.1-1 0-1.5.3V5.5c0-1.1-.9-2-2-2h-1.2z"
        fill="#fff"
        stroke="#0b0b10"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 5.5c0-1.1-.9-2-2-2s-2 .9-2 2v5"
        fill="none"
        stroke="#0b0b10"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DirectionsBoardDemo({ onTraced }: DirectionsBoardDemoProps) {
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const tracedRef = useRef(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>(reduced ? 'interactive' : 'diagonal');

  const isDemo = demoPhase === 'diagonal' || demoPhase === 'combo';

  const cellFromPoint = useCallback((x: number, y: number): number | null => {
    if (typeof document === 'undefined') return null;
    const el = document.elementFromPoint(x, y);
    const tile = el?.closest('[data-demo-cell]') as HTMLElement | null;
    if (!tile) return null;
    const idx = Number(tile.dataset.demoCell);
    return Number.isFinite(idx) ? idx : null;
  }, []);

  const extend = useCallback((idx: number) => {
    setSelected((prev) => {
      if (prev.includes(idx)) return prev;
      if (prev.length === 0) return [idx];
      const last = prev[prev.length - 1];
      if (!isAdjacent(last, idx)) return prev;
      return [...prev, idx];
    });
  }, []);

  const finish = useCallback(() => {
    draggingRef.current = false;
    setSelected((prev) => {
      if (!tracedRef.current && pathProvesDiagonal(prev)) {
        tracedRef.current = true;
        setDone(true);
        onTraced?.();
        return prev; // keep the winning path lit
      }
      // Not a diagonal word — clear so they can try again.
      return tracedRef.current ? prev : [];
    });
  }, [onTraced]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (done || isDemo) return;
      draggingRef.current = true;
      setStarted(true);
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported — pointermove still fires on the container */
      }
      const idx = cellFromPoint(e.clientX, e.clientY);
      setSelected(idx == null ? [] : [idx]);
    },
    [cellFromPoint, done, isDemo],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || done || isDemo) return;
      const idx = cellFromPoint(e.clientX, e.clientY);
      if (idx != null) extend(idx);
    },
    [cellFromPoint, extend, done, isDemo],
  );

  const onPointerUp = useCallback(() => {
    if (done || isDemo) return;
    finish();
  }, [finish, done, isDemo]);

  // Safety net: a pointerup that lands outside the container still ends the drag.
  // This runs even during the demo because it only acts when draggingRef is true.
  // The demo blocks pointer handlers via pointer-events-none, so no drag starts.
  const handleGlobalPointerUp = useCallback(() => {
    if (draggingRef.current) finish();
  }, [finish]);

  useGlobalPointerUp(handleGlobalPointerUp);

  const showArrows = !started && !done && !isDemo;

  const diagonalKeys = handKeyframes(TARGET_PATH);
  const comboKeys = handKeyframes(COMBO_PATH);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        role="group"
        aria-label="Practice board — drag across letters in any direction"
        className={cn(
          'relative touch-none select-none',
          isDemo && 'pointer-events-none',
        )}
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="grid grid-cols-3 gap-2">
          {LETTERS.map((letter, i) => {
            const isSelected = selected.includes(i);
            const order = selected.indexOf(i);
            const isTarget = TARGET_PATH.includes(i);
            return (
              <m.div
                key={i}
                data-demo-cell={i}
                initial={false}
                animate={
                  reduced
                    ? {}
                    : isSelected
                      ? { scale: [1, 1.12, 1] }
                      : isTarget && showArrows
                        ? { scale: [1, 1.06, 1] }
                        : { scale: 1 }
                }
                transition={
                  reduced
                    ? undefined
                    : isSelected
                      ? { duration: 0.25 }
                      : { duration: 1.4, repeat: showArrows ? Infinity : 0, repeatDelay: 0.4, delay: order >= 0 ? order * 0.05 : 0 }
                }
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-2xl font-black shadow-hard transition-colors',
                  done && isSelected
                    ? 'bg-neo-lime text-neo-black'
                    : isSelected
                      ? 'bg-neo-cyan text-neo-black'
                      : isTarget
                        ? 'bg-neo-navy-elevated text-neo-white'
                        : 'bg-neo-navy-light text-neo-white/60',
                )}
              >
                {letter}
              </m.div>
            );
          })}
        </div>

        {/* Connecting line through the traced path — the visual that sells the
            diagonal. A faint dashed hint sits on the target until they start. */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 208 208"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {showArrows && (
            <polyline
              points={pointsAttr(TARGET_PATH)}
              fill="none"
              stroke="var(--neo-lime)"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2 9"
              opacity={0.55}
            />
          )}
          {selected.length > 1 && (
            <polyline
              points={pointsAttr(selected)}
              fill="none"
              stroke={done ? 'var(--neo-lime)' : 'var(--neo-cyan)'}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Demo trail: a glowing cyan stroke that follows the animated hand. */}
          {demoPhase === 'diagonal' && (
            <m.polyline
              points={pointsAttr(TARGET_PATH)}
              fill="none"
              stroke="var(--neo-cyan)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(0,255,255,0.9)]"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: DIAGONAL_DURATION,
                ease: 'easeInOut',
                repeat: DEMO_DIAGONAL_LOOPS - 1,
              }}
            />
          )}
          {demoPhase === 'combo' && (
            <m.polyline
              points={pointsAttr(COMBO_PATH)}
              fill="none"
              stroke="var(--neo-lime)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(191,255,0,0.9)]"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: COMBO_DURATION,
                ease: 'easeInOut',
              }}
            />
          )}
        </svg>

        {/* Compass overlay — 8 arrows radiating from the centre tile. */}
        {showArrows && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            {ARROW_ANGLES.map((angle, i) => (
              <m.span
                key={angle}
                className="absolute text-lg font-black text-neo-lime drop-shadow-[0_1px_0_rgba(0,0,0,0.9)]"
                style={{ transform: `translateY(-56px) rotate(${angle}deg)`, transformOrigin: 'center 56px' }}
                animate={reduced ? { opacity: 0.9 } : { opacity: [0.25, 1, 0.25], scale: [0.8, 1.1, 0.8] }}
                transition={reduced ? undefined : { duration: 1.6, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
              >
                <span style={{ display: 'inline-block', transform: `rotate(${angle}deg)` }}>↑</span>
              </m.span>
            ))}
          </div>
        )}

        {/* Animated hand cursor that traces the demo path before the player tries. */}
        {demoPhase === 'diagonal' && (
          <m.div
            className="pointer-events-none absolute left-0 top-0 z-10"
            initial={{ x: diagonalKeys.x[0], y: diagonalKeys.y[0], opacity: 0, scale: 0.8 }}
            animate={{
              x: diagonalKeys.x,
              y: diagonalKeys.y,
              opacity: 1,
              scale: 1,
            }}
            transition={{
              x: { duration: DIAGONAL_DURATION, ease: 'easeInOut', repeat: DEMO_DIAGONAL_LOOPS - 1 },
              y: { duration: DIAGONAL_DURATION, ease: 'easeInOut', repeat: DEMO_DIAGONAL_LOOPS - 1 },
              opacity: { duration: 0.25 },
              scale: { duration: 0.25 },
            }}
            onAnimationComplete={() => setDemoPhase('combo')}
          >
            <HandIcon />
          </m.div>
        )}
        {demoPhase === 'combo' && (
          <m.div
            className="pointer-events-none absolute left-0 top-0 z-10"
            initial={{ x: comboKeys.x[0], y: comboKeys.y[0], opacity: 0, scale: 0.8 }}
            animate={{
              x: comboKeys.x,
              y: comboKeys.y,
              opacity: 1,
              scale: 1,
            }}
            transition={{
              x: { duration: COMBO_DURATION, ease: 'easeInOut' },
              y: { duration: COMBO_DURATION, ease: 'easeInOut' },
              opacity: { duration: 0.25 },
              scale: { duration: 0.25 },
            }}
            onAnimationComplete={() => setDemoPhase('interactive')}
          >
            <HandIcon />
          </m.div>
        )}

        {done && (
          <div className="pointer-events-none absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-neo-thick border-black bg-neo-lime text-lg shadow-hard">
            ✓
          </div>
        )}
      </div>
    </div>
  );
}

function useGlobalPointerUp(onUp: () => void) {
  // Keep the callback fresh without re-binding the window listener every render.
  const callbackRef = useRef(onUp);
  callbackRef.current = onUp;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const up = () => callbackRef.current();
    const cancel = () => callbackRef.current();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, []);
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * The interactive centrepiece of the directions tutorial. A real 3×3 board the
 * player can drag across, wired to the exact same 8-direction adjacency the game
 * uses — so "you can go diagonally" is learned by DOING, not by reading.
 *
 * - A compass of 8 arrows radiates from the centre tile (the infographic) to
 *   spell out "any direction" at a glance; it fades once the player starts.
 * - The suggested word (C→A→T) sits on the main diagonal, so completing it is
 *   impossible without a diagonal move — the one thing new players miss.
 * - Success = a traced path of 3+ tiles that includes at least one diagonal
 *   step. Forgiving on purpose (finger slips on a small board shouldn't punish),
 *   while still proving the concept.
 */

// Letters chosen so the main diagonal (indices 0,4,8) spells CAT.
const LETTERS = ['C', 'O', 'D', 'R', 'A', 'P', 'N', 'E', 'T'];
// The cells we visually invite the player to connect (top-left → centre → bottom-right).
const TARGET_PATH = [0, 4, 8];

// 8 compass directions, in degrees clockwise from "up".
const ARROW_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

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

export function DirectionsBoardDemo({ onTraced }: DirectionsBoardDemoProps) {
  const reduced = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const tracedRef = useRef(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

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
      if (done) return;
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
    [cellFromPoint, done],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || done) return;
      const idx = cellFromPoint(e.clientX, e.clientY);
      if (idx != null) extend(idx);
    },
    [cellFromPoint, extend, done],
  );

  const onPointerUp = useCallback(() => {
    if (done) return;
    finish();
  }, [finish, done]);

  // Safety net: a pointerup that lands outside the container still ends the drag.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const up = () => {
      if (draggingRef.current) finish();
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [finish]);

  const showArrows = !started && !done;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        role="group"
        aria-label="Practice board — drag across letters in any direction"
        className="relative touch-none select-none"
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

        {done && (
          <div className="pointer-events-none absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-neo-thick border-black bg-neo-lime text-lg shadow-hard">
            ✓
          </div>
        )}
      </div>
    </div>
  );
}

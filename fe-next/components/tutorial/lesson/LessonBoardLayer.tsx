'use client';

import { useCallback, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import s from './lesson.module.css';

export interface BoardCell {
  row: number;
  col: number;
}

export interface LessonBurst {
  key: string;
  cells: BoardCell[];
}

export interface LessonBoardLayerProps {
  /** Element that contains the real tiles (tagged data-row / data-col). */
  boardSelector: string;
  /** Path the hand demonstrates; null hides the demo. */
  handPath: BoardCell[] | null;
  /** Mid-drag: the next tile on the shown word, -1 when off it. */
  nextIndex: number;
  burst: LessonBurst | null;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TRACE_S = 1.9;
const PARTICLE_ANGLES = [0, 40, 80, 120, 160, 200, 240, 280, 320];
const PARTICLE_COLORS = ['#bfff00', '#00ffff', '#ff1493', '#ffd60a'];

function useTileRects(boardSelector: string, watch: unknown): Map<string, Rect> {
  const [rects, setRects] = useState<Map<string, Rect>>(() => new Map());
  const measure = useCallback(() => {
    const board = document.querySelector(boardSelector);
    if (!board) return;
    const next = new Map<string, Rect>();
    board.querySelectorAll<HTMLElement>('[data-row][data-col]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) next.set(`${el.dataset.row}-${el.dataset.col}`, { x: r.left, y: r.top, w: r.width, h: r.height });
    });
    setRects(next);
  }, [boardSelector]);

  useEffect(() => {
    measure();
    const settle = window.setTimeout(measure, 350);
    const board = document.querySelector(boardSelector);
    const ro = board ? new ResizeObserver(measure) : null;
    if (board && ro) ro.observe(board);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(settle);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, boardSelector, watch]);

  return rects;
}

const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

function unionOf(rects: Iterable<Rect>): Rect | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
  }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Everything the lesson draws on the real board: the guiding hand and glowing
 * path, the next-tile beacon while dragging, and the burst on a found word.
 * Never takes a pointer event.
 */
export function LessonBoardLayer({ boardSelector, handPath, nextIndex, burst }: LessonBoardLayerProps) {
  const reduced = usePrefersReducedMotion();
  const rects = useTileRects(boardSelector, `${handPath?.length}-${burst?.key}`);
  const rectOf = (c: BoardCell) => rects.get(`${c.row}-${c.col}`);

  const pathRects = (handPath ?? []).map(rectOf).filter((r): r is Rect => !!r);
  const points = pathRects.map(center);
  const nextRect = handPath && nextIndex >= 0 ? rectOf(handPath[nextIndex]) : undefined;
  const showDemo = !!handPath && nextIndex < 0 && points.length >= 2;
  const burstRects = (burst?.cells ?? []).map(rectOf).filter((r): r is Rect => !!r);
  const boardRect = unionOf(rects.values());

  return (
    <div data-testid="lesson-board-layer" aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      {showDemo && (
        <div data-testid="lesson-hand">
          {pathRects.map((r, i) => (
            <span
              key={`ring-${i}`}
              className={cn(s.tileRing, 'absolute rounded-xl border-[4px] border-neo-lime')}
              style={{ left: r.x - 3, top: r.y - 3, width: r.w + 6, height: r.h + 6, ['--delay' as string]: `${i * 160}ms` }}
            />
          ))}
          <svg className="absolute inset-0 h-full w-full overflow-visible">
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#bfff00"
              strokeOpacity={0.35}
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              className={s.march}
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#0a0a1a"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className={cn(s.press, 'absolute block h-16 w-16 rounded-full border-4 border-neo-lime')}
            style={{ left: points[0].x, top: points[0].y }}
          />
          <m.div
            className="absolute left-0 top-0"
            initial={{ x: points[0].x, y: points[0].y }}
            animate={{ x: points.map((p) => p.x), y: points.map((p) => p.y) }}
            transition={{
              duration: reduced ? 0 : TRACE_S,
              repeat: reduced ? 0 : Infinity,
              repeatDelay: 0.7,
              ease: 'easeInOut',
              times: points.map((_, i) => i / (points.length - 1)),
            }}
          >
            <HandGlyph />
          </m.div>
        </div>
      )}

      {nextRect && (
        <span
          data-testid="lesson-next-tile"
          className={cn(s.nextRing, 'absolute rounded-xl border-[5px] border-neo-lime')}
          style={{ left: nextRect.x - 4, top: nextRect.y - 4, width: nextRect.w + 8, height: nextRect.h + 8 }}
        />
      )}

      {burst && boardRect && burstRects.length > 0 && (
        <div
          key={burst.key}
          data-testid="lesson-burst"
          className="absolute overflow-hidden rounded-xl"
          style={{ left: boardRect.x, top: boardRect.y, width: boardRect.w, height: boardRect.h }}
        >
          {burstRects.map((r, i) => {
            const c = { x: center(r).x - boardRect.x, y: center(r).y - boardRect.y };
            const delay = i * 55;
            return (
              <span key={i} className="absolute" style={{ left: c.x, top: c.y }}>
                <span
                  className={cn(s.shock, 'absolute left-0 top-0 block rounded-2xl border-neo-lime')}
                  style={{ width: r.w, height: r.h, borderStyle: 'solid', ['--delay' as string]: `${delay}ms` }}
                />
                {PARTICLE_ANGLES.map((a, j) => (
                  <span
                    key={a}
                    className={cn(s.particle, 'absolute left-0 top-0 block h-2.5 w-2.5 rounded-[3px] border-2 border-neo-black')}
                    style={{
                      background: PARTICLE_COLORS[(i + j) % PARTICLE_COLORS.length],
                      ['--a' as string]: `${a + i * 17}deg`,
                      ['--d' as string]: `${r.w * 0.75 + (j % 3) * 8}px`,
                      ['--delay' as string]: `${delay}ms`,
                    }}
                  />
                ))}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HandGlyph() {
  return (
    <svg width="46" height="56" viewBox="0 0 34 42" className="-translate-x-[9px] -translate-y-[6px] drop-shadow-[3px_3px_0_#000]">
      <circle cx="9" cy="8" r="8" fill="#bfff00" opacity="0.55" />
      <path
        d="M8 6c0-2 3-2 3 0v9l5-2c2-.7 3.4 1.4 2.4 3l-4.6 7c-1.2 1.8-3 3-5.6 3H6c-2.6 0-4.4-1.6-5-4L0 17c-.5-2 2.2-3.2 3.2-1.3L5 19V6z"
        transform="translate(6 6)"
        fill="#fffef0"
        stroke="#000"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default LessonBoardLayer;

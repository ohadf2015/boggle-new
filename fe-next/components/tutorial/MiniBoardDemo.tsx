'use client';

import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

const SIZE = 3;
const CELL = 36;
const GAP = 6;
const LOOP = { duration: 2.4, repeat: Infinity, repeatDelay: 0.4, ease: 'easeInOut' as const };
/** Moment (0..1 of the loop) the finger reaches each letter, then lifts. */
const HITS = [0.12, 0.34, 0.56];
const LIFT = 0.72;

export function demoPath(rtl: boolean): number[] {
  const cells: Array<[number, number]> = [[0, 0], [1, 1], [1, 2]];
  return cells.map(([r, c]) => r * SIZE + (rtl ? SIZE - 1 - c : c));
}

/** The fingertip rests below-right of the tile centre so the letter under it stays readable. */
const FINGER_OFFSET = 17;
const centre = (i: number) => ({ x: (i % SIZE) * (CELL + GAP) + CELL / 2 + FINGER_OFFSET, y: Math.floor(i / SIZE) * (CELL + GAP) + CELL / 2 + FINGER_OFFSET });

interface MiniBoardDemoProps {
  word: string;
  points: number;
  rtl?: boolean;
  reduced?: boolean;
  className?: string;
}

/** The core move in one glance: a finger swipes a real word and it scores. */
export function MiniBoardDemo({ word, points, rtl = false, reduced = false, className }: MiniBoardDemoProps) {
  const letters = Array.from(word).slice(0, SIZE);
  const path = demoPath(rtl);
  const stops = path.map(centre);
  const side = SIZE * CELL + (SIZE - 1) * GAP;

  return (
    <div dir="ltr" aria-hidden className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative grid" style={{ width: side, height: side, gap: GAP, gridTemplate: `repeat(${SIZE}, ${CELL}px) / repeat(${SIZE}, ${CELL}px)` }}>
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const step = path.indexOf(i);
          return (
            <m.div
              key={i}
              data-testid="mini-tile"
              initial={false}
              animate={reduced || step < 0 ? {} : { scale: [1, 1, 1.16, 1, 1] }}
              transition={reduced || step < 0 ? undefined : { ...LOOP, times: [0, HITS[step] - 0.02, HITS[step] + 0.06, HITS[step] + 0.14, 1] }}
              className="relative grid place-items-center overflow-hidden rounded-lg border-2 border-neo-black bg-neo-cream font-neo-display text-lg font-bold text-neo-black shadow-[0_3px_0_rgb(var(--neo-black))]"
            >
              {step >= 0 && (
                <m.span
                  className="absolute inset-0 bg-neo-lime"
                  initial={false}
                  animate={reduced ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }}
                  transition={reduced ? undefined : { ...LOOP, times: [0, HITS[step] - 0.02, HITS[step], LIFT + 0.12, 1] }}
                />
              )}
              <span className="relative">{step >= 0 ? letters[step] : ''}</span>
            </m.div>
          );
        })}
        {!reduced && (
          <m.span
            data-testid="mini-finger"
            data-offset="below-right"
            className="pointer-events-none absolute -ms-2.5 -mt-2.5 h-5 w-5 rounded-full border-[3px] border-neo-cream edu-sky:border-edu-line bg-transparent shadow-[0_0_0_2px_rgb(var(--neo-black))]"
            style={{ left: 0, top: 0 }}
            initial={false}
            animate={{
              x: [stops[0].x, stops[0].x, stops[1].x, stops[2].x, stops[2].x + 10, stops[0].x],
              y: [stops[0].y + 14, stops[0].y, stops[1].y, stops[2].y, stops[2].y + 18, stops[0].y + 14],
              scale: [0.6, 1, 1, 1, 0.6, 0.6],
            }}
            transition={{ ...LOOP, times: [0, HITS[0], HITS[1], HITS[2], LIFT, 1] }}
          />
        )}
      </div>
      <m.span
        data-testid="mini-chip"
        initial={false}
        animate={reduced ? {} : { scale: [0, 0, 1.25, 1, 1, 0] }}
        transition={reduced ? undefined : { ...LOOP, times: [0, LIFT - 0.02, LIFT + 0.06, LIFT + 0.12, 0.95, 1] }}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-cream px-3 py-0.5 font-neo-display text-base font-bold text-neo-black shadow-[0_3px_0_rgb(var(--neo-black))]"
      >
        <span dir="auto">{letters.join('')}</span>
        <span className="rounded-full bg-neo-lime px-1.5 tabular-nums">+{points}</span>
      </m.span>
    </div>
  );
}

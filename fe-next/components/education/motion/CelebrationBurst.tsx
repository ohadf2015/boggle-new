'use client';

import { m } from 'framer-motion';
import { memo } from 'react';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

export const CELEBRATION_BURST_MAX = 16;

const TONES = ['bg-neo-lime', 'bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow', 'bg-neo-purple'] as const;

const SPARKLES = [
  { corner: 'ts', pos: 'top-1 start-1', size: 'h-3.5 w-3.5', delay: 0 },
  { corner: 'te', pos: 'top-1 end-2', size: 'h-2.5 w-2.5', delay: 0.04 },
  { corner: 'bs', pos: 'bottom-2 start-2', size: 'h-2 w-2', delay: 0.08 },
  { corner: 'be', pos: 'bottom-1 end-1', size: 'h-3.5 w-3.5', delay: 0.02 },
] as const;
const SPARKLE_DUR_S = 0.3;
export const SPARKLE_MAX_S = SPARKLE_DUR_S + Math.max(...SPARKLES.map((s) => s.delay));

export interface CelebrationBurstProps {
  playing: boolean;
  /** Change it to replay the burst. */
  burstKey?: string | number;
  /** confetti: radial pieces for round/lesson end. sparkle: four corner stars for a correct answer. */
  variant?: 'confetti' | 'sparkle';
  count?: number;
  className?: string;
}

/** Index-seeded, so a re-render never re-scatters the pieces. */
function piece(i: number, count: number) {
  const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.25;
  const reach = 48 + ((i * 17) % 28);
  const x = Math.cos(angle) * reach;
  const y = Math.sin(angle) * reach * 0.75;
  const turn = (i % 2 ? 1 : -1) * (180 + ((i * 29) % 180));
  return { x, y, turn, duration: 0.7 + ((i * 7) % 5) * 0.06 };
}

function Sparkles() {
  return (
    <>
      {SPARKLES.map((s) => (
        <m.svg
          key={s.corner}
          data-testid="edu-burst-piece"
          data-corner={s.corner}
          viewBox="0 0 16 16"
          className={`absolute text-neo-lime ${s.pos} ${s.size}`}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: [0, 1.15, 0], rotate: [0, 30, 45] }}
          transition={{ duration: SPARKLE_DUR_S, delay: s.delay, times: [0, 0.4, 1], ease: 'easeOut' }}
        >
          <path d="M8 0 C8.6 5 11 7.4 16 8 C11 8.6 8.6 11 8 16 C7.4 11 5 8.6 0 8 C5 7.4 7.4 5 8 0 Z" fill="currentColor" />
        </m.svg>
      ))}
    </>
  );
}

// Fills its nearest positioned parent and clips there, so it never becomes a fullscreen layer.
export const CelebrationBurst = memo(function CelebrationBurst({
  playing,
  burstKey,
  variant = 'confetti',
  count = 12,
  className = '',
}: CelebrationBurstProps) {
  const reduced = useEduReducedMotion();
  if (!playing || reduced) return null;
  const n = Math.max(1, Math.min(CELEBRATION_BURST_MAX, Math.round(count)));
  return (
    <div
      key={burstKey}
      aria-hidden="true"
      data-testid="edu-celebration-burst"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {variant === 'sparkle'
        ? <Sparkles />
        : Array.from({ length: n }, (_, i) => {
            const p = piece(i, n);
            return (
              <m.span
                key={i}
                data-testid="edu-burst-piece"
                className={`absolute left-1/2 top-1/2 -ml-1 -mt-1.5 h-3 w-2 rounded-[2px] border border-neo-black ${TONES[i % TONES.length]}`}
                initial={{ x: 0, y: 0, rotate: 0, scale: 0 }}
                animate={{ x: [0, p.x, p.x * 1.1], y: [0, p.y, p.y + 28], rotate: [0, p.turn / 2, p.turn], scale: [0, 1, 0] }}
                transition={{ duration: p.duration, times: [0, 0.35, 1], ease: 'easeOut' }}
              />
            );
          })}
    </div>
  );
});

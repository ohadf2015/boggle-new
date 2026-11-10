'use client';

import { cn } from '@/lib/utils';
import { streakTier, type StreakTier } from '@/lib/daily/streakRewards';
import styles from './StreakFlame.module.css';

export type FlameMood = 'happy' | 'worried' | 'sleepy';

interface StreakFlameProps {
  days: number;
  /** Rendered height in px; width follows the art's 4:5 ratio. */
  size: number;
  mood?: FlameMood;
  animated?: boolean;
  className?: string;
}

const OUTER = 'M32 3C36 15 50 23 54 39C58 55 50 75 32 78C14 75 6 57 10 41C12 33 18 29 20 21C24 29 26 33 28 35C28 23 30 13 32 3Z';
const INNER = 'M33 27C36 37 46 43 46 55C46 67 40 73 32 73C23 73 18 65 19 56C20 49 25 46 27 41C29 46 30 48 31 49C31 41 31 34 33 27Z';
const CORE = 'M32 52C35 57 39 60 39 65C39 70 36 72 32 72C28 72 25 70 25 66C25 62 29 59 32 52Z';
const SPARK = 'M0 -5L1.4 -1.4L5 0L1.4 1.4L0 5L-1.4 1.4L-5 0L-1.4 -1.4Z';

// Complete literal class strings per tier so Tailwind can see every utility.
const PALETTE: Record<StreakTier, { outer: string; inner: string; core: string }> = {
  none: { outer: 'fill-neo-navy-light', inner: 'fill-neo-navy', core: 'fill-neo-navy-light' },
  ember: { outer: 'fill-neo-red', inner: 'fill-neo-orange', core: 'fill-neo-yellow' },
  flame: { outer: 'fill-neo-orange', inner: 'fill-neo-yellow', core: 'fill-neo-cream' },
  blue: { outer: 'fill-neo-cyan', inner: 'fill-neo-cyan-light', core: 'fill-neo-white' },
  violet: { outer: 'fill-neo-purple', inner: 'fill-neo-pink', core: 'fill-neo-cream' },
  legendary: { outer: 'fill-neo-pink', inner: 'fill-neo-yellow', core: 'fill-neo-white' },
};

function Face({ mood, animated }: { mood: FlameMood; animated: boolean }) {
  if (mood === 'sleepy') {
    return (
      <g className="stroke-neo-black" strokeWidth={2.2} strokeLinecap="round" fill="none">
        <path d="M25.5 58H29.5M34.5 58H38.5" />
        <path d="M30 64H34" />
      </g>
    );
  }
  return (
    <g>
      <g className={animated ? styles.blink : undefined}>
        <circle cx={27.5} cy={58} r={2.7} className="fill-neo-black" />
        <circle cx={36.5} cy={58} r={2.7} className="fill-neo-black" />
        <circle cx={28.4} cy={57} r={0.9} className="fill-neo-white" />
        <circle cx={37.4} cy={57} r={0.9} className="fill-neo-white" />
      </g>
      <g className="stroke-neo-black" strokeWidth={2} strokeLinecap="round" fill="none">
        {mood === 'worried' ? (
          <>
            <path d="M24 53.5L29 52M40 53.5L35 52" />
            <path d="M29.5 65.5Q32 63 34.5 65.5" />
          </>
        ) : (
          <path d="M29 62.5Q32 66 35 62.5" />
        )}
      </g>
    </g>
  );
}

/**
 * The streak's kawaii flame. Each tier is a different fire: a small red ember,
 * an orange flame, a blue-hot flame, a violet supernova with sparks, and a
 * crowned legendary one. Motion is a transform-only sway on this one small
 * element and stops under prefers-reduced-motion.
 */
export function StreakFlame({ days, size, mood = 'happy', animated = true, className }: StreakFlameProps) {
  const tier = streakTier(days);
  const colors = PALETTE[tier];
  const face: FlameMood = tier === 'none' ? 'sleepy' : mood;
  const moving = animated && tier !== 'none';
  const hot = tier === 'blue' || tier === 'violet' || tier === 'legendary';
  const sparks = tier === 'violet' || tier === 'legendary';

  return (
    <span
      data-testid="streak-flame"
      data-tier={tier}
      data-mood={face}
      aria-hidden="true"
      className={cn('relative inline-block shrink-0', className)}
      style={{ height: size, width: size * 0.8 }}
    >
      {tier === 'legendary' && (
        <svg
          data-testid="streak-flame-crown"
          viewBox="0 0 40 24"
          className="absolute start-1/2 top-0 z-10 w-[46%] -translate-x-1/2 -translate-y-[38%] rtl:translate-x-1/2"
        >
          <path d="M4 22L2 6L12 13L20 2L28 13L38 6L36 22Z" className="fill-neo-black" transform="translate(1.5 1.5)" />
          <path d="M4 22L2 6L12 13L20 2L28 13L38 6L36 22Z" className="fill-neo-yellow stroke-neo-black" strokeWidth={2.5} strokeLinejoin="round" />
          <circle cx={20} cy={16} r={2.6} className="fill-neo-pink stroke-neo-black" strokeWidth={1.5} />
        </svg>
      )}
      <svg viewBox="0 0 64 82" className="h-full w-full overflow-visible">
        <g data-animated={moving ? 'true' : undefined} className={moving ? (hot ? styles.danceHot : styles.dance) : undefined}>
          <path d={OUTER} className="fill-neo-black" transform="translate(3.5 3.5)" />
          <path
            d={OUTER}
            className={cn(colors.outer, tier === 'none' ? 'stroke-neo-cream/40' : 'stroke-neo-black')}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {tier !== 'none' && <path d={INNER} className={colors.inner} />}
          {tier !== 'none' && <path d={CORE} className={colors.core} />}
          <Face mood={face} animated={moving} />
        </g>
        {sparks && (
          <>
            <path d={SPARK} transform="translate(6 18)" className={cn('fill-neo-yellow', moving && styles.sparkle)} />
            <path d={SPARK} transform="translate(58 30) scale(0.8)" className={cn('fill-neo-cream', moving && styles.sparkleLate)} />
          </>
        )}
      </svg>
    </span>
  );
}

export default StreakFlame;

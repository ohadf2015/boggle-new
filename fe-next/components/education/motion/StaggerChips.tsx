'use client';

import { m } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { EDU_MS } from '@/lib/education/motion/tokens';
import { resolvePreset } from '@/lib/education/motion/presets';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { CountUp } from './CountUp';

export type ChipTone = 'yellow' | 'lime' | 'cyan' | 'pink' | 'purple';

export interface MotionChip {
  id: string;
  label: ReactNode;
  value: number;
  from?: number;
  tone: ChipTone;
  icon?: ReactNode;
  format?: (n: number) => string;
}

const TONE: Record<ChipTone, { head: string; border: string }> = {
  yellow: { head: 'bg-neo-yellow', border: 'border-neo-yellow' },
  lime: { head: 'bg-neo-lime', border: 'border-neo-lime' },
  cyan: { head: 'bg-neo-cyan', border: 'border-neo-cyan' },
  pink: { head: 'bg-neo-pink', border: 'border-neo-pink' },
  purple: { head: 'bg-neo-purple', border: 'border-neo-purple' },
};

export interface StaggerChipsProps {
  chips: MotionChip[];
  staggerMs?: number;
  /** Final values at once, with no dings: for skip and reduced motion. */
  instant?: boolean;
  /** The per-chip ding hook, called as that chip's count-up lands. */
  onLand?: (index: number) => void;
  className?: string;
}

export function StaggerChips({ chips, staggerMs = EDU_MS.chipStagger, instant = false, onLand, className = '' }: StaggerChipsProps) {
  const reduced = useEduReducedMotion();
  const still = instant || reduced;
  const count = chips.length;
  const [shown, setShown] = useState(still ? count : Math.min(1, count));

  useEffect(() => {
    if (still) {
      setShown(count);
      return;
    }
    const ids = Array.from({ length: Math.max(0, count - 1) }, (_, i) =>
      setTimeout(() => setShown((s) => Math.max(s, i + 2)), (i + 1) * staggerMs),
    );
    return () => ids.forEach(clearTimeout);
  }, [count, staggerMs, still]);

  const chipIn = resolvePreset('chipIn', still);

  return (
    <ul className={`flex flex-wrap justify-center gap-3 ${className}`}>
      {chips.slice(0, shown).map((chip, i) => (
        <m.li
          key={chip.id}
          data-testid="edu-chip"
          initial={chipIn.initial}
          animate={chipIn.animate}
          transition={chipIn.transition}
          className={`min-w-24 overflow-hidden rounded-neo border-4 bg-neo-navy shadow-hard ${TONE[chip.tone].border}`}
        >
          <p className={`px-3 py-1 text-center font-neo-display text-xs font-black uppercase tracking-wide text-neo-black ${TONE[chip.tone].head}`}>
            {chip.label}
          </p>
          <p className="flex items-center justify-center gap-1 px-3 py-2 font-neo-display text-2xl font-black text-neo-cream">
            {chip.icon}
            <CountUp
              to={chip.value}
              from={chip.from}
              format={chip.format}
              durationMs={still ? 0 : undefined}
              onDone={still ? undefined : () => onLand?.(i)}
            />
          </p>
        </m.li>
      ))}
    </ul>
  );
}

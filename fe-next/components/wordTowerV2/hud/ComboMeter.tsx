'use client';

import { m } from 'framer-motion';
import { comboTier, type ComboTier } from './hudFormat';

const TIER_CLASS: Record<Exclude<ComboTier, 0>, string> = {
  1: 'bg-neo-pink px-1.5 text-[10px] shadow-hard-sm lg:text-sm',
  2: 'bg-neo-pink px-2 text-xs shadow-hard ring-2 ring-neo-yellow lg:text-base',
  3: 'bg-neo-yellow px-2 text-sm shadow-hard ring-[3px] ring-neo-pink lg:text-lg',
};

const SPARKS = [
  { x: -14, y: -16 },
  { x: 0, y: -22 },
  { x: 14, y: -16 },
];

interface Props {
  combo: number;
  reducedMotion?: boolean;
}

/** The streak multiplier in the HUD; it gets louder per tier (glow at x4, shake and sparks at x7). */
export function ComboMeter({ combo, reducedMotion }: Props) {
  const tier = comboTier(combo);
  if (tier === 0) return null;
  return (
    <m.span
      key={combo}
      data-wt2-combo
      data-tier={tier}
      className={`relative inline-flex shrink-0 items-center rounded-neo border-neo border-black py-0.5 font-neo-display font-black leading-tight tabular-nums text-neo-navy ${TIER_CLASS[tier]}`}
      initial={reducedMotion ? false : { scale: 1.6, rotate: -8 }}
      animate={reducedMotion ? undefined : { scale: 1, rotate: tier >= 3 ? [0, -7, 7, -4, 0] : 0 }}
      transition={{ type: tier >= 3 ? 'tween' : 'spring', stiffness: 640, damping: 15, duration: 0.45 }}
    >
      ×{combo}
      {tier >= 3 && !reducedMotion
        ? SPARKS.map((s, i) => (
            <m.span
              key={i}
              aria-hidden
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-[1px] border border-black bg-neo-cyan"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{ x: s.x, y: s.y, opacity: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.04 }}
            />
          ))
        : null}
    </m.span>
  );
}

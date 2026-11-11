'use client';

import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TIERS = [
  '',
  'bg-neo-lime text-neo-black text-sm shadow-hard-sm',
  'bg-neo-cyan text-neo-black text-base shadow-hard',
  'bg-neo-pink text-neo-white text-lg shadow-hard-lg',
] as const;

export function comboTier(level: number): 0 | 1 | 2 | 3 {
  if (level < 2) return 0;
  return level === 2 ? 1 : level === 3 ? 2 : 3;
}

export interface CrosswordComboChipProps {
  level: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Word-chain counter that hits harder each link; sits over the masthead, never the board or clues. */
export function CrosswordComboChip({ level, t }: CrosswordComboChipProps) {
  const reduced = useReducedMotion();
  const tier = comboTier(level);
  const tilt = tier === 3 ? (level % 2 ? -6 : 6) : tier === 2 ? -3 : 0;

  return (
    <AdaptiveAnimatePresence>
      {tier > 0 && (
        <AdaptiveMotion.div
          key={level}
          data-testid="cw-combo"
          data-tier={tier}
          role="status"
          initial={reduced ? false : { scaleX: 1.6, scaleY: 0.5, rotate: 0 }}
          animate={{ scaleX: 1, scaleY: 1, rotate: tilt }}
          exit={reduced ? undefined : { scale: 0.4, opacity: 0, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 520 + tier * 120, damping: 11 - tier * 2 }}
          className={`pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-30 mx-auto w-fit rounded-neo border-neo border-black px-3 py-1 font-neo-display font-bold uppercase lg:top-2 ${TIERS[tier]}`}
        >
          {t('crossword.combo', { count: level })}
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}

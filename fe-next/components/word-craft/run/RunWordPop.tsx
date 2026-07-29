'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import type { WordFeedbackTier } from '@/lib/word-craft/run/feedbackTiers';

export interface RunWordPopData {
  total: number;
  tier: WordFeedbackTier;
  /** Bumps per commit so identical scores still re-fire the animation. */
  key: number;
}

// Bigger word → bigger, brighter pop.
const TIER_STYLE: Record<WordFeedbackTier, string> = {
  nice: 'bg-neo-cyan text-neo-black',
  great: 'bg-neo-purple text-neo-white',
  huge: 'bg-neo-lime text-neo-black',
};
const TIER_SCALE: Record<WordFeedbackTier, number> = { nice: 1, great: 1.12, huge: 1.28 };

/**
 * RunWordPop — the per-word commit ceremony for WordCraft run mode.
 *
 * Fills the "submit → nothing happens" dead zone: each committed word pops a
 * tier-scaled "+points" with a word of praise. Presentational; the tier comes
 * from the pure wordFeedbackTier.
 */
export default function RunWordPop({
  pop,
  t,
}: {
  pop: RunWordPopData | null;
  t: (key: string) => string;
}) {
  return (
    <AdaptiveAnimatePresence>
      {pop && (
        <AdaptiveMotion.div
          key={pop.key}
          initial={{ opacity: 0, y: 16, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: TIER_SCALE[pop.tier] }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 360, damping: 16 }}
          data-testid="run-word-pop"
          data-tier={pop.tier}
          className={cn(
            'pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2',
            'flex items-center gap-2 rounded-neo border-neo-thick border-black px-4 py-1.5',
            'font-neo-display font-black uppercase shadow-hard',
            TIER_STYLE[pop.tier],
          )}
        >
          <span>+{pop.total}</span>
          <span className="text-sm">{t(`wordcraft.run.feedback.${pop.tier}`)}</span>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}

/**
 * Treasure Chest Reveal
 *
 * The payoff of the pick: the chest pops open and the outcome lands — gain,
 * double, steal, swap, or a small loss. Positive outcomes get a bounded
 * confetti burst; a loss gets kind wording and no fanfare.
 *
 * Dark-only fullscreen overlay: hardcoded bg-neo-navy (Class 5 — never the
 * cream/dark pair on a lazily mounted surface). The card enters with a
 * transform-only spring, no opacity tween. Tap anywhere to dismiss; the parent
 * also auto-dismisses so the student never misses the next question.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { TreasureChestOutcome, TreasureChestState, TranslateFn } from '@/shared/types/vocabQuiz';
import { cn } from '@/lib/utils';
import { BoundedConfettiBurst } from '@/components/motion/BoundedConfettiBurst';
import { ChestIcon } from './ChestIcon';

export interface TreasureChestRevealProps {
  state: TreasureChestState;
  t: TranslateFn;
  onDismiss?: () => void;
}

const OUTCOME_TEXT: Record<TreasureChestOutcome, string> = {
  gain: 'text-neo-lime',
  double: 'text-neo-yellow',
  steal: 'text-neo-pink',
  swap: 'text-neo-cyan',
  'small-loss': 'text-neo-orange',
};

const OUTCOME_BORDER: Record<TreasureChestOutcome, string> = {
  gain: 'border-neo-lime',
  double: 'border-neo-yellow',
  steal: 'border-neo-pink',
  swap: 'border-neo-cyan',
  'small-loss': 'border-neo-orange',
};

function outcomeLabel(state: TreasureChestState, t: TranslateFn): string {
  const target = state.targetUsername || '?';
  const amount = Math.abs(state.amount);
  switch (state.outcome) {
    case 'gain':
      return t('vocabQuiz.treasure.outcome.gain', { amount });
    case 'double':
      return t('vocabQuiz.treasure.outcome.double', { amount });
    case 'steal':
      return t('vocabQuiz.treasure.outcome.steal', { target, amount });
    case 'swap':
      return t('vocabQuiz.treasure.outcome.swap', { target });
    case 'small-loss':
      return t('vocabQuiz.treasure.outcome.small-loss', { amount });
  }
}

export function TreasureChestReveal({ state, t, onDismiss }: TreasureChestRevealProps) {
  const reduceMotion = useReducedMotion();
  const celebrate = state.outcome !== 'small-loss';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy px-4"
    >
      <BoundedConfettiBurst trigger={celebrate && !reduceMotion} size="lg">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.5, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
          className={cn(
            'flex flex-col items-center gap-3 w-full max-w-sm p-6 text-center',
            'rounded-neo border-[3px] bg-neo-navy-elevated shadow-hard',
            OUTCOME_BORDER[state.outcome]
          )}
        >
          <ChestIcon open size={96} />
          <p className={cn('font-neo-display font-bold text-3xl leading-tight', OUTCOME_TEXT[state.outcome])}>
            {outcomeLabel(state, t)}
          </p>
          {typeof state.myScore === 'number' && (
            <p className="font-neo-body text-lg text-neo-white">
              {t('vocabQuiz.treasure.newTotal', { score: state.myScore })}
            </p>
          )}
          {onDismiss && (
            <p className="font-neo-body text-sm text-neo-white/70">{t('vocabQuiz.treasure.tapToContinue')}</p>
          )}
        </motion.div>
      </BoundedConfettiBurst>
    </div>
  );
}

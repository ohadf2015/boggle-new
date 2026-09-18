/**
 * Treasure Chest Reveal
 *
 * Shows the outcome of a opened chest: gain, double, steal, swap, or small-loss.
 * Celebratory for positive outcomes (gain, double, steal, swap), subdued for losses.
 * Uses confetti burst for big wins and motion-safe scale animations.
 *
 * Dark-only overlay: hardcoded bg-neo-navy (not bg-neo-cream dark:bg-neo-navy).
 * No entrance opacity tween (Class 5 pitfall).
 */

import { useMemo } from 'react';
import type { TreasureChestOutcome, TreasureChestState, TranslateFn } from '@/shared/types/vocabQuiz';
import { cn } from '@/lib/utils';
import { BoundedConfettiBurst } from '@/components/motion/BoundedConfettiBurst';

export interface TreasureChestRevealProps {
  state: TreasureChestState;
  t: TranslateFn;
}

export function TreasureChestReveal({ state, t }: TreasureChestRevealProps) {
  const { outcome, amount, targetUsername } = state;

  const outcomeColor: Record<TreasureChestOutcome, string> = {
    gain: 'text-neo-lime',
    double: 'text-neo-yellow',
    steal: 'text-neo-pink',
    swap: 'text-neo-pink',
    'small-loss': 'text-neo-orange',
  };

  const outcomeBg: Record<TreasureChestOutcome, string> = {
    gain: 'bg-neo-navy-elevated border-neo-lime',
    double: 'bg-neo-navy-elevated border-neo-yellow',
    steal: 'bg-neo-navy-elevated border-neo-pink',
    swap: 'bg-neo-navy-elevated border-neo-pink',
    'small-loss': 'bg-neo-navy-elevated border-neo-orange',
  };

  // Celebrate on positive outcomes (not just gain/double)
  const shouldCelebrate = outcome !== 'small-loss';
  const celebrateConfetti = shouldCelebrate && ['gain', 'double', 'steal', 'swap'].includes(outcome);

  const label = useMemo(() => {
    switch (outcome) {
      case 'gain':
        return t('vocabQuiz.treasure.outcome.gain', { amount: Math.abs(amount) });
      case 'double':
        return t('vocabQuiz.treasure.outcome.double', { amount });
      case 'steal':
        return t('vocabQuiz.treasure.outcome.steal', { target: targetUsername || '?', amount });
      case 'swap':
        return t('vocabQuiz.treasure.outcome.swap', { target: targetUsername || '?' });
      case 'small-loss':
        return t('vocabQuiz.treasure.outcome.small-loss', { amount: Math.abs(amount) });
    }
  }, [outcome, amount, targetUsername, t]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/80 p-3">
      <div
        className={cn(
          'rounded-neo border-[3px]',
          'p-6 max-w-sm text-center',
          outcomeColor[outcome],
          outcomeBg[outcome],
          'shadow-hard',
          // Gentle scale + fade animation on entrance, motion-safe
          'animate-[cosy-quiet-in_400ms_ease-out]'
        )}
      >
        <p className="font-neo-display font-bold text-2xl mb-3">{label}</p>

        {targetUsername && (outcome === 'steal' || outcome === 'swap') && (
          <p className="font-neo-body text-sm text-neo-white/70">
            {outcome === 'steal'
              ? t('vocabQuiz.treasure.stolenFrom', { name: targetUsername })
              : t('vocabQuiz.treasure.swappedWith', { name: targetUsername })}
          </p>
        )}
      </div>

      {/* Confetti burst for positive outcomes */}
      {celebrateConfetti && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <BoundedConfettiBurst />
        </div>
      )}
    </div>
  );
}

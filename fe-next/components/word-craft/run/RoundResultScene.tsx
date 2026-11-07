'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { meterZone } from '@/lib/word-craft/run/feedbackTiers';

interface RoundResultSceneProps {
  passed: boolean;
  round: number;
  roundScore: number;
  target: number;
  onProceed: () => void;
}

export function RoundResultScene({ passed, round, roundScore, target, onProceed }: RoundResultSceneProps) {
  const { t } = useLanguage();
  // Near-miss (85%+ but not reached) gets its own framing — a flat "failed" on a
  // one-word-short round reads as unfair and kills the "one more try" pull.
  const isNearMiss = !passed && meterZone(roundScore, target) === 'close';
  return (
    <section className="flex flex-col items-center gap-4 p-6 text-center" data-round={round}>
      <h2
        className={`text-3xl font-neo-display ${passed ? 'text-neo-lime' : isNearMiss ? 'text-neo-orange' : 'text-neo-red'}`}
      >
        {t(passed ? 'wordcraft.run.roundResult.passed' : 'wordcraft.run.roundResult.failed')}
      </h2>
      <p className="font-neo-body text-neo-white">
        {t(
          passed
            ? 'wordcraft.run.roundResult.passedSub'
            : isNearMiss
              ? 'wordcraft.run.roundResult.closeSub'
              : 'wordcraft.run.roundResult.failedSub'
        )}
      </p>
      <p className="font-neo-display text-neo-white">
        {roundScore} / {target}
      </p>
      <button
        type="button"
        onClick={onProceed}
        className="animate-neo-press rounded-neo border-neo-thick border-neo-lime bg-neo-lime px-6 py-2 font-neo-display text-neo-navy shadow-hard"
      >
        {t('wordcraft.run.proceed')}
      </button>
    </section>
  );
}

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { LetterFeedback } from '@/shared/types/game';
import { HUNT_MAX_ATTEMPTS } from '@/lib/adventure/huntMode';

interface HuntAttempt {
  guess: string;
  feedback: LetterFeedback[];
}

interface AdventureHuntClueBoxesProps {
  targetLength: number;
  attempts: HuntAttempt[];
  huntFound: boolean;
}

const feedbackClass: Record<LetterFeedback, string> = {
  correct: 'bg-neo-lime text-neo-navy',
  present: 'bg-neo-yellow text-neo-navy',
  absent: 'bg-neo-navy-light text-neo-white',
};

export default function AdventureHuntClueBoxes({
  targetLength,
  attempts,
  huntFound,
}: AdventureHuntClueBoxesProps) {
  const { t } = useLanguage();
  const last = attempts[attempts.length - 1];
  const triesLeft = Math.max(0, HUNT_MAX_ATTEMPTS - attempts.length);

  return (
    <div className="flex flex-col items-center gap-2" data-testid="hunt-clue-boxes">
      <div className="flex gap-1.5 justify-center flex-wrap">
        {Array.from({ length: targetLength }).map((_, i) => {
          const fb = last?.feedback?.[i];
          const letter = huntFound || fb === 'correct' ? last?.guess?.[i] ?? '' : '';
          const cls = fb ? feedbackClass[fb] : 'bg-neo-navy text-neo-white';
          return (
            <div
              key={`clue-${i}`}
              data-testid={`hunt-clue-box-${i}`}
              data-feedback={fb ?? 'empty'}
              className={`w-8 h-10 border-neo rounded-neo shadow-hard-sm flex items-center justify-center font-neo-display text-lg uppercase ${cls}`}
            >
              {letter}
            </div>
          );
        })}
      </div>
      <div
        data-testid="hunt-tries-counter"
        className="text-xs font-neo-body text-neo-white"
      >
        {t('adventure.mode.huntTriesLeft', { count: triesLeft, max: HUNT_MAX_ATTEMPTS })}
      </div>
    </div>
  );
}

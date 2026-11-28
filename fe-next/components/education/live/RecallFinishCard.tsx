'use client';

import { useEffect } from 'react';
import { Flame, Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EduT } from '@/components/education/lobby/eduText';
import type { RecallSummary } from '@/lib/education/recallScore';
import { fireConfetti } from '@/utils/confettiUtils';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import { useLanguageSafe } from '@/contexts/LanguageContext';

interface RecallFinishCardProps {
  run: RecallSummary;
  words: number;
  newBest: boolean;
  t: EduT;
}

export function RecallFinishCard({ run, words, newBest, t }: RecallFinishCardProps) {
  const { language } = useLanguageSafe();

  useEffect(() => {
    fireConfetti({ particleCount: 70 + run.stars * 20, spread: 75, origin: { y: 0.45 } });
  }, [run]);

  return (
    <div
      data-testid="recall-finish"
      data-stars={run.stars}
      data-score={run.score}
      role="status"
      className="relative flex flex-col items-center gap-1 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-3 py-1.5 text-center text-neo-black shadow-hard motion-safe:animate-[recall-pop_280ms_cubic-bezier(0.23,1,0.32,1)_both]"
    >
      {newBest && (
        <span className="absolute -top-3 end-3 inline-flex rotate-3 items-center gap-1 rounded-full border-2 border-neo-black bg-neo-pink px-2 py-0.5 font-neo-display text-xs font-black uppercase text-neo-black shadow-hard-sm">
          <Trophy className="size-3.5" aria-hidden="true" />
          {t('eduStudent.recall.newBest')}
        </span>
      )}
      <p className="font-neo-display text-xl font-black leading-tight">
        {t(pluralKeyOf('eduStudent.recall.finishTitle', words, language), { count: words })}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <div className="flex items-end" role="img" aria-label={t('eduStudent.recall.stars', { count: run.stars })}>
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              aria-hidden="true"
              style={{ animationDelay: `${(n - 1) * 90}ms` }}
              className={cn(
                n === 2 ? 'size-7' : 'size-6',
                n <= run.stars ? 'fill-neo-yellow text-neo-black motion-safe:animate-[recall-star_260ms_cubic-bezier(0.23,1,0.32,1)_backwards]' : 'fill-neo-black/10 text-neo-black/35'
              )}
              strokeWidth={2.5}
            />
          ))}
        </div>
        <span className="rounded-full border-2 border-neo-black bg-neo-lime px-2.5 py-0.5 font-neo-display text-sm font-black tabular-nums shadow-hard-sm">
          {t('eduStudent.recall.finishScore', { score: run.score })}
        </span>
        {run.bestCombo >= 2 && (
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-sm font-black shadow-hard-sm">
            <Flame className="size-4" aria-hidden="true" />
            <span dir="ltr" aria-hidden="true" className="tabular-nums">{t('eduStudent.recall.multiplier', { count: run.bestCombo })}</span>
            <span className="sr-only">{t('eduStudent.recall.bestCombo', { count: run.bestCombo })}</span>
          </span>
        )}
      </div>
    </div>
  );
}

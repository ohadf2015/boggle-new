'use client';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { MasteryListRow } from '@/lib/wordMastery';

interface WordMasteryListsProps {
  mastered: MasteryListRow[];
  learning: MasteryListRow[];
  onPractice: () => void;
  practiceDisabled: boolean;
  practiceLoading: boolean;
}

function WordChip({ word, tone }: { word: string; tone: 'mastered' | 'learning' }) {
  return (
    <li>
      <span
        className={cn(
          'inline-flex items-center rounded-neo border-2 border-neo-black px-2.5 py-1 font-neo-display text-sm font-black uppercase tracking-wide shadow-hard-sm',
          tone === 'mastered'
            ? 'bg-neo-cyan text-neo-black'
            : 'bg-neo-yellow text-neo-black',
        )}
      >
        {word}
      </span>
    </li>
  );
}

export function WordMasteryLists({
  mastered,
  learning,
  onPractice,
  practiceDisabled,
  practiceLoading,
}: WordMasteryListsProps) {
  const { t } = useLanguage();
  const isEmpty = mastered.length === 0 && learning.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {isEmpty ? (
        <p className="text-neo-white/80 font-neo-body text-sm">{t('wordMastery.emptyAll')}</p>
      ) : (
        <>
          <section aria-labelledby="word-mastery-mastered">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="word-mastery-mastered" className="font-neo-display text-lg font-black uppercase tracking-wide text-neo-white">
                {t('wordMastery.mastered')}
              </h2>
              <span className="text-neo-white/60 text-xs font-bold uppercase">
                {t('wordMastery.count', { count: mastered.length })}
              </span>
            </div>
            {mastered.length === 0 ? (
              <p className="text-neo-white/70 text-sm">{t('wordMastery.emptyMastered')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {mastered.map((row) => (
                  <WordChip key={`${row.language}-${row.word}`} word={row.word} tone="mastered" />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="word-mastery-learning">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="word-mastery-learning" className="font-neo-display text-lg font-black uppercase tracking-wide text-neo-white">
                {t('wordMastery.learning')}
              </h2>
              <span className="text-neo-white/60 text-xs font-bold uppercase">
                {t('wordMastery.count', { count: learning.length })}
              </span>
            </div>
            {learning.length === 0 ? (
              <p className="text-neo-white/70 text-sm">{t('wordMastery.emptyLearning')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {learning.map((row) => (
                  <WordChip key={`${row.language}-${row.word}`} word={row.word} tone="learning" />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="flex flex-col gap-2">
        <Button
          variant="cyan"
          haptic
          onClick={onPractice}
          disabled={practiceDisabled || practiceLoading}
        >
          {t('wordMastery.practiceCta')}
        </Button>
        <p className="text-neo-white/60 text-xs">{t('wordMastery.practiceHint')}</p>
      </div>
    </div>
  );
}

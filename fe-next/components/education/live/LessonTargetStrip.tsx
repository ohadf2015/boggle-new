'use client';

import { Target } from 'lucide-react';
import { Pop } from '@/components/education/motion/Pop';
import { cn } from '@/lib/utils';
import { maskLessonWord, type LessonTarget } from './lessonTargets';

export interface LessonTargetStripProps {
  targets: LessonTarget[];
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  className?: string;
}

/** Dark-only surface, so colours are fixed against navy rather than a cream/dark pair. */
export function LessonTargetStrip({ targets, t, dir, className }: LessonTargetStripProps) {
  const found = targets.filter((x) => x.found).length;

  return (
    <div
      data-testid="lesson-target-strip"
      dir={dir}
      className={cn(
        'pointer-events-none fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-lg',
        'border-3 border-b-0 border-neo-cream rounded-t-neo bg-neo-navy text-white shadow-hard',
        'px-3 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-cyan">
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          <Pop pulseKey={found}>{t('education.wordBank.huntTitle', { found, total: targets.length })}</Pop>
        </span>
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {targets.map(({ word, found: isFound }) => {
            const { first, rest } = maskLessonWord(word);
            return (
              <li
                key={word}
                data-found={isFound ? 'true' : 'false'}
                aria-label={isFound ? undefined : t('education.wordBank.huntHidden', { length: rest + 1 })}
                className={cn(
                  'rounded-neo border-2 border-neo-black px-1.5 py-0.5 font-neo-display text-sm font-black uppercase leading-none shadow-hard-sm',
                  isFound ? 'bg-neo-lime text-neo-black' : 'bg-neo-cream text-neo-black',
                )}
              >
                {isFound ? (
                  <Pop pulseKey={word}>{word}</Pop>
                ) : (
                  <span aria-hidden="true">
                    {first}
                    <span className="ms-0.5 tracking-[0.15em] text-neo-black/45">{'·'.repeat(rest)}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default LessonTargetStrip;

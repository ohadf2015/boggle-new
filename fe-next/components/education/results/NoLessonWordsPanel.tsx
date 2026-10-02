'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { ClassWord } from './lessonTally';

export interface NoLessonWordsPanelProps {
  words: ClassWord[];
  size: 'projector' | 'card';
  /** The lesson words still to teach, under a plain heading. */
  children?: ReactNode;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Points but no lesson word: say it straight, then show what the class really found. */
export function NoLessonWordsPanel({ words, size, children, t }: NoLessonWordsPanelProps) {
  const reduceMotion = useReducedMotion();
  const projector = size === 'projector';

  return (
    <div data-testid="no-lesson-words-panel" className={cn('flex min-h-0 flex-col gap-2', projector && 'h-full 2xl:gap-3')}>
      <p dir="auto" className={cn('font-neo-display font-black uppercase leading-tight text-neo-cyan', projector ? 'text-2xl 2xl:text-4xl' : 'text-lg')}>
        {t('eduLive.results.noLessonTitle')}
      </p>
      <p dir="auto" className={cn('font-neo-body font-bold leading-snug text-neo-white/85', projector ? 'text-lg 2xl:text-2xl' : 'text-sm')}>
        {t(words.length > 0 ? 'eduLive.results.noLessonBody' : 'eduLive.results.noLessonBodyEmpty')}
      </p>
      {words.length > 0 && (
        <ul className={cn('flex shrink-0 flex-wrap content-start gap-2', projector && '2xl:gap-3')}>
          {words.map((entry, i) => (
            <m.li
              key={entry.word}
              data-testid={`class-word-${entry.word}`}
              data-word={entry.word}
              initial={reduceMotion ? false : { scale: 0.6, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 18, delay: 0.08 * i }}
              className={cn(
                'flex items-center gap-1.5 rounded-neo border-[2px] border-neo-black bg-neo-cyan font-bold uppercase text-neo-black shadow-hard-sm',
                projector ? 'px-3 py-1.5 text-xl 2xl:px-4 2xl:py-2 2xl:text-3xl' : 'px-3 py-1.5 text-sm'
              )}
            >
              <span dir="auto">{applyHebrewFinalLetters(entry.word)}</span>
              {entry.foundBy.length > 1 && (
                <span className={cn('opacity-70 tabular-nums', projector ? 'text-lg' : 'text-xs')}>×{entry.foundBy.length}</span>
              )}
            </m.li>
          ))}
        </ul>
      )}
      <p dir="auto" className={cn('font-neo-body font-bold text-neo-white/70', projector ? 'text-base 2xl:text-xl' : 'text-xs')}>
        {t('eduLive.results.noLessonHint')}
      </p>
      {children && <div className={cn('mt-1', projector && 'min-h-0 flex-1')}>{children}</div>}
    </div>
  );
}

export default NoLessonWordsPanel;

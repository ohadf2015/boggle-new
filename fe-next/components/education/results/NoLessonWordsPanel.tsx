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
  /** Shares the wall with the Pro card: no board hint, at most four found words. */
  compact?: boolean;
  /** Phone beside the Pro card: name the problem, skip the found-word chips. */
  hideWords?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Points but no lesson word: say it straight, then show what the class really found. */
export function NoLessonWordsPanel({ words, size, children, compact = false, hideWords = false, t }: NoLessonWordsPanelProps) {
  const reduceMotion = useReducedMotion();
  const projector = size === 'projector';
  const shown = hideWords ? [] : compact ? words.slice(0, 4) : words;

  return (
    <div data-testid="no-lesson-words-panel" className={cn('flex min-h-0 flex-col gap-1.5', projector && 'h-full @[96rem]/results:gap-3')}>
      <p dir="auto" className={cn('font-neo-display font-bold leading-tight text-neo-cream', projector ? 'text-xl @[96rem]/results:text-3xl' : 'text-base')}>
        {t('eduLive.results.noLessonTitle')}
      </p>
      <p dir="auto" className={cn('font-neo-body font-bold leading-snug text-neo-white/85', projector ? 'text-base @[96rem]/results:text-xl' : 'text-sm')}>
        {t(words.length > 0 ? 'eduLive.results.noLessonBody' : 'eduLive.results.noLessonBodyEmpty')}
      </p>
      {shown.length > 0 && (
        <ul className={cn('flex shrink-0 flex-wrap content-start gap-2', projector && '@[96rem]/results:gap-3')}>
          {shown.map((entry, i) => (
            <m.li
              key={entry.word}
              data-testid={`class-word-${entry.word}`}
              data-word={entry.word}
              initial={reduceMotion ? false : { scale: 0.6, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 18, delay: 0.08 * i }}
              className={cn(
                'flex items-center gap-1.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy font-bold text-neo-cream',
                projector ? 'px-2.5 py-1 text-base @[96rem]/results:px-3.5 @[96rem]/results:py-1.5 @[96rem]/results:text-2xl' : 'px-2.5 py-1 text-sm'
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
      {!compact && (
        <p dir="auto" className={cn('font-neo-body font-bold text-neo-white/70', projector ? 'text-base @[96rem]/results:text-xl' : 'text-xs')}>
          {t('eduLive.results.noLessonHint')}
        </p>
      )}
      {children && <div className={cn('mt-1', projector && 'min-h-0 flex-1')}>{children}</div>}
    </div>
  );
}

export default NoLessonWordsPanel;

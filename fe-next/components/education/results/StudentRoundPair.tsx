'use client';

import { BookOpen, BookOpenCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackResultsAction } from './trackResultsAction';

type Translate = (key: string, params?: Record<string, string | number>) => string;

const TILE = 'flex min-w-0 flex-col gap-0.5 rounded-neo-lg border-[3px] border-neo-black px-3 py-2 text-neo-black shadow-hard';
const LABEL = 'flex items-center gap-1 font-neo-body text-xs font-black uppercase tracking-wide';

interface StudentRoundPairProps {
  bestWord: { word: string; score: number } | null;
  lesson: { found: number; total: number } | null;
  t: Translate;
}

/** The round in two numbers a student cares about: my best word and how many lesson words I caught. */
export function StudentRoundPair({ bestWord, lesson, t }: StudentRoundPairProps) {
  const showLesson = !!lesson && lesson.total > 0;
  if (!bestWord && !showLesson) return null;
  return (
    <div className={cn('grid w-full gap-2', bestWord && showLesson ? 'grid-cols-2' : 'grid-cols-1')}>
      {bestWord && (
        <div data-testid="edu-student-best-word" className={cn(TILE, 'bg-neo-yellow')}>
          <span className={LABEL}>
            <Star className="size-3.5 shrink-0 fill-neo-black" aria-hidden="true" />
            {t('mpUi.results.bestWord')}
          </span>
          <span className="flex min-w-0 items-baseline gap-1.5 font-neo-display font-black">
            <span dir="auto" className="min-w-0 truncate text-xl uppercase">{bestWord.word}</span>
            <span dir="ltr" className="shrink-0 text-sm tabular-nums">+{bestWord.score}</span>
          </span>
        </div>
      )}
      {showLesson && lesson && (
        <div data-testid="edu-student-lesson" className={cn(TILE, 'bg-neo-cream')}>
          <span className={LABEL}>
            <BookOpenCheck className="size-3.5 shrink-0" aria-hidden="true" />
            {t('eduLiveRoom.hostResults.statLesson')}
          </span>
          <span dir="ltr" className="self-start font-neo-display text-xl font-black tabular-nums">{`${lesson.found}/${lesson.total}`}</span>
        </div>
      )}
    </div>
  );
}

/** Teacher-paced room: the next game reaches this phone by itself, so waiting is a quiet bar, never a loud card. */
export function StudentWaitBar({ onPractice, t }: { onPractice?: () => void; t: Translate }) {
  return (
    <div className="flex w-full flex-col gap-2">
      {onPractice && (
        <button
          type="button"
          data-testid="practice-missed-button"
          data-results-primary=""
          onClick={() => {
            trackResultsAction('practice', 'student');
            onPractice();
          }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black bg-neo-cyan px-4 py-2.5 font-neo-display text-lg font-black text-neo-black shadow-hard-lg transition-transform duration-150 ease-out active:translate-x-0.5 active:translate-y-0.5 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          <BookOpen className="size-5 shrink-0" aria-hidden="true" />
          {t('education.results.practiceMissed')}
        </button>
      )}
      <div
        data-testid="wait-for-teacher-message"
        data-results-primary={onPractice ? undefined : ''}
        role="status"
        aria-live="polite"
        className="flex min-h-11 w-full items-center gap-2.5 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light px-3 py-2 font-neo-body text-sm font-bold text-neo-cream"
      >
        <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inset-0 animate-ping rounded-full bg-neo-lime motion-reduce:animate-none" />
          <span className="relative size-2.5 rounded-full bg-neo-lime" />
        </span>
        <span className="min-w-0 leading-snug">{t('education.results.waitingForTeacher')}</span>
      </div>
    </div>
  );
}

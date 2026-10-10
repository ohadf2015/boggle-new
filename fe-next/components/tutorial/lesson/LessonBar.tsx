'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LessonStep } from '@/lib/tutorial/lesson/lessonEngine';
import type { PathCell } from '@/utils/wordPathFinder';

export interface LessonBarProps {
  steps: readonly LessonStep[];
  completedCount: number;
  hintWord: string | null;
  hintPath: PathCell[] | null;
  onSkip: () => void;
}

type PraiseKey = 'nice' | 'great' | 'wow' | 'amazing';
const PRAISE: readonly PraiseKey[] = ['nice', 'great', 'wow', 'amazing'];
const PRAISE_MS = 1500;

/**
 * One-line lesson for a mode's first round: a segmented progress bar, the
 * current instruction, and a praise pill that pops on every completed step.
 * Reads only props, so each mode can drive it with its own steps.
 */
export function LessonBar({ steps, completedCount, hintWord, hintPath, onSkip }: LessonBarProps) {
  const { t, dir } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const total = steps.length;
  const done = completedCount >= total;
  const current = steps[Math.min(completedCount, total - 1)];

  const [seen, setSeen] = useState(completedCount);
  const [praise, setPraise] = useState<{ n: number; key: PraiseKey } | null>(null);
  if (completedCount !== seen) {
    setSeen(completedCount);
    if (completedCount > seen) {
      setPraise({ n: completedCount, key: PRAISE[Math.min(completedCount - 1, PRAISE.length - 1)] });
    }
  }
  useEffect(() => {
    if (!praise) return;
    const id = window.setTimeout(() => setPraise(null), PRAISE_MS);
    return () => window.clearTimeout(id);
  }, [praise]);

  const isRtl = dir === 'rtl';
  const fillOrigin = isRtl ? 'origin-right' : 'origin-left';

  let caption: ReactNode;
  if (done) {
    caption = t('lesson.complete');
  } else if (current.kind === 'hint' && hintWord) {
    caption = (
      <>
        {t('lesson.try')} <span className="font-neo-display uppercase tracking-wide text-neo-lime">{hintWord}</span>
      </>
    );
  } else {
    caption = current.minLength <= 3 ? t('lesson.findAny') : t('lesson.findLength', { count: current.minLength });
  }

  return (
    <div
      data-testid="lesson-bar"
      data-completed={completedCount}
      data-total={total}
      data-lesson-path={JSON.stringify((hintPath ?? []).map((c) => [c.row, c.col]))}
      dir={dir}
      className="relative flex w-full flex-col gap-2 rounded-neo border-[3px] border-neo-black bg-neo-navy-light px-3 py-2 shadow-hard-sm"
    >
      <div className="flex min-h-7 items-center justify-between gap-2">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false}>
            {praise && !done ? (
              <m.p
                key={praise.n}
                data-testid="lesson-praise"
                initial={reduced ? false : { y: 12, scale: 0.8 }}
                animate={{ y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { y: -10 }}
                transition={{ type: 'spring', stiffness: 520, damping: 24 }}
                className="inline-block rounded-neo border-2 border-neo-black bg-neo-lime px-2.5 py-0.5 font-neo-display text-base font-black text-neo-black shadow-[2px_2px_0_#000]"
              >
                {t(`lesson.${praise.key}`)}
              </m.p>
            ) : (
              <m.p
                key="caption"
                data-testid="lesson-caption"
                initial={reduced ? false : { y: 8 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="truncate font-neo-body text-sm font-bold text-neo-cream"
              >
                {caption}
              </m.p>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 font-neo-body text-xs font-bold text-neo-cream/70 underline-offset-2 hover:text-neo-cream hover:underline"
        >
          {t('lesson.skip')}
        </button>
      </div>

      <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completedCount} className="flex gap-1.5">
        {steps.map((step, i) => (
          <span
            key={step.id}
            className="relative h-2.5 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-black/50"
          >
            <m.span
              className={`absolute inset-0 bg-neo-lime ${fillOrigin}`}
              initial={false}
              animate={{ scaleX: i < completedCount ? 1 : 0 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

export default LessonBar;

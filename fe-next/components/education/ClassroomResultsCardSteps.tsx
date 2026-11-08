'use client';

import { useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { EDU_MOTION, Reveal, pressMotion, pressClasses, useReducedMotionSafe } from '@/components/education/motion';
import { cn } from '@/lib/utils';
import { useOverlayQuietZoneClaim } from '@/lib/overlayQuietZone';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { resultSteps, studentLessonTally, studentLine, studentMissedWords } from './ClassroomResultsCardSteps.model';
import { LessonStep, MissedStep, ScoreStep } from './ClassroomResultsCardStepViews';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassroomResultsCardStepsProps {
  summary: ClassroomSummary;
  username: string;
  standings?: { username: string; score: number; isBot?: boolean }[];
  hideClassPlacings?: boolean;
  /** Language the lesson words are spoken in; defaults to the UI language. */
  wordLang?: string;
  onFinish: () => void;
  onPlayAgain?: () => void;
  onPractice?: () => void;
}

const BTN = 'flex min-h-12 items-center justify-center rounded-neo border-3 border-neo-black px-5 font-neo-display text-base font-black uppercase tracking-wide';
const GHOST = 'flex min-h-11 items-center justify-center self-center text-balance text-center rounded-neo px-4 font-neo-display text-sm font-black uppercase tracking-[0.12em] text-neo-white/60 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan [@media(hover:hover)]:hover:text-neo-white sm:min-h-12 sm:border-3 sm:border-neo-white/20 sm:whitespace-nowrap sm:px-5 sm:active:translate-y-[2px]';

/** Student lesson-complete flow: one reward per screen, one CONTINUE in a fixed footer. */
export function ClassroomResultsCardSteps({
  summary, username, standings, hideClassPlacings = false, wordLang, onFinish, onPlayAgain, onPractice,
}: ClassroomResultsCardStepsProps) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as unknown as T;
  const reduced = useReducedMotionSafe();
  useOverlayQuietZoneClaim(true, 'classroom-results-steps');

  const line = useMemo(() => studentLine(summary, username, standings), [summary, username, standings]);
  const missed = useMemo(() => studentMissedWords(summary, username), [summary, username]);
  const tally = useMemo(() => studentLessonTally(summary, username), [summary, username]);
  const steps = useMemo(() => resultSteps({ hasScore: !!line, missedCount: missed.length }), [line, missed.length]);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;

  const buzz = () => {
    if (!reduced && typeof navigator !== 'undefined') navigator.vibrate?.(8);
  };
  const next = () => {
    buzz();
    if (!last) return setIndex(index + 1);
    if (onPlayAgain) return onPlayAgain();
    onFinish();
  };

  // "Review" only earns its place when it skips a screen; otherwise it would just be a second CONTINUE.
  const missedAt = steps.indexOf('missed');
  const ghost = missedAt > index + 1
    ? { label: t('education.results.steps.reviewCount', { count: missed.length }), onClick: () => setIndex(missedAt) }
    : onPractice && { label: t('education.results.steps.practice'), onClick: onPractice };
  const primaryLabel = last && onPlayAgain ? t('education.results.playAgain') : t('education.results.steps.continue');

  return (
    <section
      data-testid="classroom-results-steps"
      data-step={step}
      aria-label={t('education.results.title')}
      className="flex h-full min-h-0 w-full flex-col bg-neo-navy text-neo-white"
    >
      <div className="flex shrink-0 justify-center px-4 pt-4" aria-label={t('education.results.steps.progress', { step: index + 1, total: steps.length })} role="img">
        <div className="flex w-full max-w-md gap-2">
          {steps.map((s, i) => (
            <span key={s} className="relative h-3 flex-1 overflow-hidden rounded-full border-2 border-neo-cream/60 bg-neo-navy">
              <m.span
                className="absolute inset-0 block origin-left rounded-full bg-neo-lime rtl:origin-right"
                initial={false}
                animate={{ scaleX: i <= index ? 1 : 0 }}
                transition={reduced ? { duration: 0 } : EDU_MOTION.spring.settle}
              />
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain px-4 py-4 [container-type:size]">
        <Reveal key={step} className="flex h-full w-full items-center justify-center">
          {step === 'score' && line && (
            <ScoreStep
              score={line.score}
              rank={line.rank}
              players={line.players}
              showRank={!hideClassPlacings}
              lessonName={summary.lessonNames.join(', ')}
              missed={missed}
              wordLang={wordLang ?? language}
              t={t}
            />
          )}
          {step === 'lesson' && <LessonStep found={tally.found} total={tally.total} t={t} />}
          {step === 'missed' && <MissedStep words={missed} wordLang={wordLang ?? language} t={t} />}
        </Reveal>
      </div>

      <div
        data-testid="results-steps-footer"
        className="sticky bottom-0 shrink-0 border-t-[3px] border-neo-cream/50 bg-neo-navy px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 sm:p-6"
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:max-w-[58rem] sm:flex-row-reverse sm:items-center sm:justify-between sm:gap-6">
          <m.button
            type="button"
            data-testid="results-steps-primary"
            {...pressMotion(reduced)}
            onClick={next}
            className={cn(pressClasses(4), BTN, 'w-full bg-neo-lime text-neo-black sm:w-auto sm:min-w-[12rem]')}
          >
            {primaryLabel}
          </m.button>
          {ghost && (
            <m.button
              type="button"
              data-testid="results-steps-ghost"
              {...pressMotion(reduced)}
              onClick={ghost.onClick}
              className={GHOST}
            >
              {ghost.label}
            </m.button>
          )}
        </div>
      </div>
    </section>
  );
}

export default ClassroomResultsCardSteps;

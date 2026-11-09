'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { getHuntLesson } from './survival/howto/howtoDemos';
import { LessonClueStep, LessonColorsStep, LessonGuessStep, LessonReadyStep } from './survival/howto/HowtoSteps';
import { LifeMeter } from './survival/howto/HowtoTiles';

export type HuntTutorialSource = 'daily_first_visit' | 'daily_help' | 'quick_play';

export interface DailyChallengeTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
  /** Where the lesson opened, for the step funnel. */
  source?: HuntTutorialSource;
}

type Step = 'clue' | 'colors' | 'guess' | 'ready';
const STEPS: Step[] = ['clue', 'colors', 'guess', 'ready'];

type TutorialEvent = 'wordhunt_tutorial_shown' | 'wordhunt_tutorial_step' | 'wordhunt_tutorial_skipped' | 'wordhunt_tutorial_completed';

/** The lesson's life bar drains like the game's (slowly, never to zero) so "words heal" means something. */
const LIFE_START = 70;
const LIFE_FLOOR = 35;
const LIFE_DRAIN_PER_TICK = 1;
const LIFE_TICK_MS = 1000;
export const CLUE_LIFE_GAIN = 20;

const PRIMARY_BTN =
  'flex w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-pink py-4 text-lg font-black uppercase text-neo-white shadow-hard active:translate-y-0.5 active:shadow-hard-sm';

interface FooterAction {
  label: string;
  onClick: () => void;
  final?: boolean;
}

export const DailyChallengeTutorial: React.FC<DailyChallengeTutorialProps> = ({ onComplete, onSkip, source = 'daily_help' }) => {
  const { t, language, dir } = useLanguage();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>('clue');
  const [clueCleared, setClueCleared] = useState(false);
  const [solved, setSolved] = useState(false);
  const [life, setLife] = useState(LIFE_START);
  const [gain, setGain] = useState(0);
  const lesson = useMemo(() => getHuntLesson(language), [language]);
  const textDir = dir === 'rtl' ? 'rtl' : 'ltr';
  const index = STEPS.indexOf(step);
  const startedAt = useRef(0);

  const track = useCallback(
    (event: TutorialEvent, extra: Record<string, string | number> = {}) => {
      trackGrowthEvent(event, {
        source,
        language,
        step: STEPS[index],
        step_index: index,
        elapsed_sec: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0,
        ...extra,
      });
    },
    [source, language, index],
  );

  // One "shown" per mount; the ref keeps a re-render from logging twice.
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    startedAt.current = Date.now();
    track('wordhunt_tutorial_shown');
  }, [track]);

  const playable = step === 'clue' || step === 'guess';
  const draining = (step === 'clue' && !clueCleared) || (step === 'guess' && !solved);
  useEffect(() => {
    if (!draining) return undefined;
    const id = window.setInterval(() => setLife((v) => Math.max(LIFE_FLOOR, v - LIFE_DRAIN_PER_TICK)), LIFE_TICK_MS);
    return () => window.clearInterval(id);
  }, [draining]);

  const go = (next: Step) => {
    triggerHaptic('swipe');
    track('wordhunt_tutorial_step', { next });
    setGain(0);
    setStep(next);
  };

  const handleClue = () => {
    triggerHaptic('success');
    setClueCleared(true);
    setLife((v) => Math.min(100, v + CLUE_LIFE_GAIN));
    setGain(CLUE_LIFE_GAIN);
  };

  const handleSolved = () => {
    triggerHaptic('success');
    setSolved(true);
  };

  const finish = () => {
    triggerHaptic('success');
    track('wordhunt_tutorial_completed');
    onComplete();
  };

  const skip = () => {
    track('wordhunt_tutorial_skipped');
    onSkip();
  };

  const footerFor = (): FooterAction | null => {
    if (step === 'clue') return clueCleared ? { label: t('tutorial.wordHunt.howto.next'), onClick: () => go('colors') } : null;
    if (step === 'colors') return { label: t('tutorial.wordHunt.lesson.colorsNext'), onClick: () => go('guess') };
    if (step === 'guess') return solved ? { label: t('tutorial.wordHunt.howto.next'), onClick: () => go('ready') } : null;
    return { label: t('tutorial.wordHunt.howto.play'), onClick: finish, final: true };
  };
  const footer = footerFor();
  const slide = textDir === 'rtl' ? -32 : 32;

  return (
    // z-[120]: above the ready screen's play CTA, which is portaled to <body> at z-[100].
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('daily.howToPlay')}
      dir={textDir}
      data-step={step}
      className="fixed inset-0 z-[120] flex flex-col bg-neo-navy text-neo-white"
    >
      <header className="mx-auto flex w-full max-w-md shrink-0 items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-2.5 rounded-full border-2 border-neo-black transition-[width]',
                i === index ? 'w-8 bg-neo-pink' : i < index ? 'w-2.5 bg-neo-pink' : 'w-2.5 bg-neo-navy-light',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={skip}
          className="min-h-11 rounded-full px-3 py-1.5 text-sm font-black uppercase text-neo-white/70 hover:text-neo-white"
        >
          {t('common.skip')}
        </button>
      </header>

      {playable && (
        <div className="mx-auto flex w-full max-w-md shrink-0 justify-center px-4">
          <LifeMeter value={life} gain={gain} t={t} />
        </div>
      )}

      <div data-testid="tutorial-body" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={step}
            initial={reduce ? false : { x: slide, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? undefined : { x: -slide, opacity: 0 }}
            transition={SPRING_PRESETS.balanced}
            className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-4"
          >
            {step === 'clue' && <LessonClueStep lesson={lesson} dir={textDir} t={t} cleared={clueCleared} onCleared={handleClue} />}
            {step === 'colors' && <LessonColorsStep lesson={lesson} dir={textDir} t={t} />}
            {step === 'guess' && <LessonGuessStep lesson={lesson} dir={textDir} t={t} solved={solved} onSolved={handleSolved} />}
            {step === 'ready' && <LessonReadyStep t={t} />}
          </m.div>
        </AnimatePresence>
      </div>

      <footer
        data-testid="tutorial-footer"
        className="mx-auto min-h-[5.5rem] w-full max-w-md shrink-0 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]"
      >
        {footer && (
          <m.button
            key={step}
            type="button"
            onClick={footer.onClick}
            initial={reduce ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={SPRING_PRESETS.balanced}
            className={PRIMARY_BTN}
          >
            {footer.label}
            {!footer.final && <ArrowRight aria-hidden="true" className="h-5 w-5 rtl:rotate-180" />}
          </m.button>
        )}
      </footer>
    </div>
  );
};

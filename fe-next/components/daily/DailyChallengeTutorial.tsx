'use client';

import React, { useMemo, useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { getHowtoDemo } from './survival/howto/howtoDemos';
import { HowtoBoardStep, HowtoFeedbackStep, HowtoGoalStep } from './survival/howto/HowtoSteps';

export interface DailyChallengeTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 'board' | 'feedback' | 'goal';
const STEPS: Step[] = ['board', 'feedback', 'goal'];

const PRIMARY_BTN =
  'flex w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-pink py-4 text-lg font-black uppercase text-neo-white shadow-hard active:translate-y-0.5 active:shadow-hard-sm';

export const DailyChallengeTutorial: React.FC<DailyChallengeTutorialProps> = ({ onComplete, onSkip }) => {
  const { t, language, dir } = useLanguage();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>('board');
  const demo = useMemo(() => getHowtoDemo(language), [language]);
  const textDir = dir === 'rtl' ? 'rtl' : 'ltr';
  const index = STEPS.indexOf(step);

  const go = (next: Step) => {
    triggerHaptic(next === 'feedback' ? 'success' : 'swipe');
    setStep(next);
  };

  const finish = () => {
    triggerHaptic('success');
    onComplete();
  };

  const slide = textDir === 'rtl' ? -32 : 32;

  return (
    // z-[120]: above the ready screen's play CTA, which is portaled to <body> at z-[100].
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('daily.howToPlay')}
      dir={textDir}
      className="fixed inset-0 z-[120] flex flex-col bg-neo-navy text-neo-white"
    >
      <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
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
          onClick={onSkip}
          className="rounded-full px-3 py-1.5 text-sm font-black uppercase text-neo-white/70 hover:text-neo-white"
        >
          {t('common.skip')}
        </button>
      </header>

      <div data-testid="tutorial-body" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={step}
            initial={reduce ? false : { x: slide }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: -slide }}
            transition={SPRING_PRESETS.balanced}
            className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-4"
          >
            {step === 'board' && <HowtoBoardStep demo={demo} dir={textDir} t={t} onTraced={() => go('feedback')} />}
            {step === 'feedback' && <HowtoFeedbackStep demo={demo} dir={textDir} t={t} />}
            {step === 'goal' && <HowtoGoalStep demo={demo} dir={textDir} t={t} />}
          </m.div>
        </AnimatePresence>
      </div>

      {step !== 'board' && (
        <footer
          data-testid="tutorial-footer"
          className="mx-auto w-full max-w-md shrink-0 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]"
        >
          {step === 'feedback' ? (
            <button type="button" onClick={() => go('goal')} className={PRIMARY_BTN}>
              {t('tutorial.wordHunt.howto.next')}
              <ArrowRight aria-hidden="true" className="h-5 w-5 rtl:rotate-180" />
            </button>
          ) : (
            <button type="button" onClick={finish} className={PRIMARY_BTN}>
              {t('tutorial.wordHunt.howto.play')}
            </button>
          )}
        </footer>
      )}
    </div>
  );
};

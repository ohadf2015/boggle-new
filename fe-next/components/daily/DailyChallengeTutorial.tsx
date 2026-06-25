'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { m, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { triggerHaptic } from '@/utils/hapticFeedback';

export interface DailyChallengeTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * 3 steps, down from 5. Each step leads with a brand illustration that does the
 * "feel" work; the mechanic-critical color feedback stays as live DOM tiles so
 * it localizes (5 languages, Hebrew RTL) and renders crisp at any size.
 *   1. Guess the word   — goal + the green/yellow/gray legend
 *   2. Free bonus words  — the twist: short words cost no try, they pay life+clues
 *   3. Ready to hunt      — same puzzle worldwide, start
 */
const TOTAL_STEPS = 3;

/**
 * Locale-aware example tiles for the step-1 legend. The colors always teach the
 * same lesson — the letters just change to match the player's language.
 * Hebrew/Swedish use vetted vocabulary; Japanese keeps romaji because the live
 * board does. `feedback`: per-tile { letter, state } where state ∈
 * {gray,green,yellow}.
 */
type TileState = 'gray' | 'green' | 'yellow';
interface TutorialExample {
  feedback: ReadonlyArray<{ letter: string; state: TileState }>;
}

const TUTORIAL_EXAMPLES: Record<string, TutorialExample> = {
  en: {
    feedback: [
      { letter: 'S', state: 'gray' },
      { letter: 'E', state: 'green' },
      { letter: 'A', state: 'yellow' },
      { letter: 'R', state: 'gray' },
      { letter: 'S', state: 'gray' },
    ],
  },
  es: {
    feedback: [
      { letter: 'P', state: 'gray' },
      { letter: 'L', state: 'green' },
      { letter: 'A', state: 'yellow' },
      { letter: 'Y', state: 'gray' },
      { letter: 'A', state: 'gray' },
    ],
  },
  sv: {
    feedback: [
      { letter: 'S', state: 'gray' },
      { letter: 'O', state: 'green' },
      { letter: 'L', state: 'yellow' },
      { letter: 'E', state: 'gray' },
      { letter: 'N', state: 'gray' },
    ],
  },
  // Hebrew uses 4-letter vetted vocabulary; the green/yellow/gray lesson holds.
  he: {
    feedback: [
      { letter: 'ש', state: 'gray' },
      { letter: 'מ', state: 'green' },
      { letter: 'ח', state: 'yellow' },
      { letter: 'ה', state: 'gray' },
    ],
  },
  ja: {
    // Romaji per project convention — live Word Hunt board on `ja` is romaji.
    feedback: [
      { letter: 'S', state: 'gray' },
      { letter: 'E', state: 'green' },
      { letter: 'A', state: 'yellow' },
      { letter: 'R', state: 'gray' },
      { letter: 'S', state: 'gray' },
    ],
  },
};

function getTutorialExample(language: string): TutorialExample {
  return TUTORIAL_EXAMPLES[language] || TUTORIAL_EXAMPLES.en;
}

const TILE_COLORS: Record<TileState, string> = {
  gray: 'bg-gray-400 border-gray-500 text-white',
  green: 'bg-green-500 border-green-700 text-white',
  yellow: 'bg-yellow-500 border-yellow-600 text-neo-black dark:text-neo-black',
};

/** Framed brand illustration. Images are text-free + direction-neutral (RTL-safe). */
const TutorialHero: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <div className="mb-4 overflow-hidden rounded-neo border-2 border-neo-black shadow-hard">
    <Image
      src={src}
      alt={alt}
      width={600}
      height={400}
      sizes="(max-width: 480px) 100vw, 448px"
      className="block w-full h-auto"
    />
  </div>
);

export const DailyChallengeTutorial: React.FC<DailyChallengeTutorialProps> = ({
  onComplete,
  onSkip,
}) => {
  const { t, dir } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => {
    triggerHaptic('swipe');
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      triggerHaptic('success');
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      triggerHaptic('swipe');
      setCurrentStep(currentStep - 1);
    }
  };

  const swipeHandlers = useSwipeGesture({
    onSwipe: (direction) => {
      if (direction === 'left') nextStep();
      else if (direction === 'right') prevStep();
    },
    threshold: 50,
  });

  const renderStepBody = () => {
    switch (currentStep) {
      case 1:
        return <Step1Guess />;
      case 2:
        return <Step2Bonus />;
      case 3:
        return <Step3Ready />;
      default:
        return null;
    }
  };

  const renderStepFooter = () => {
    switch (currentStep) {
      case 1:
        return (
          <Button onClick={nextStep} className="w-full bg-neo-pink text-white">
            {t('tutorial.wordHunt.welcome.next')}{' '}
            <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
          </Button>
        );
      case 2:
        return (
          <div className="flex gap-2">
            <Button onClick={prevStep} variant="outline" className="flex-1">
              ← {t('common.back')}
            </Button>
            <Button onClick={nextStep} className="flex-1 bg-neo-pink text-white">
              {t('tutorial.wordHunt.letterFeedback.gotIt')}{' '}
              <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </Button>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-2">
            <Button onClick={onComplete} className="w-full bg-neo-pink text-white text-lg py-6">
              {t('tutorial.wordHunt.complete.start')} 🚀
            </Button>
            <Button onClick={prevStep} variant="outline" size="sm">
              ← {t('common.back')}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    // z-[120] keeps this modal above the daily ready-screen's persistent green
    // "play" CTA, which is portaled to <body> at z-[100]. Equal z-index let that
    // later-in-DOM portal paint over the tutorial's action buttons.
    <div className="fixed inset-0 bg-black/80 text-white flex items-center justify-center z-[120] p-4">
      <div
        className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black max-w-md w-full p-6 shadow-neo-brutalist relative flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
        {...swipeHandlers}
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-neo-navy-light rounded-full transition-colors z-10"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress indicator — fixed header, never scrolls */}
        <div className="flex items-center justify-center gap-2 mb-5 shrink-0">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={`tutorial-dot-${i}`}
              className={cn(
                'h-2 rounded-full transition-all',
                i + 1 === currentStep
                  ? 'w-8 bg-neo-pink'
                  : i + 1 < currentStep
                  ? 'w-2 bg-neo-pink'
                  : 'w-2 bg-gray-300 dark:bg-gray-600'
              )}
            />
          ))}
        </div>

        {/* Scrollable body — shrinks to fit; only this region scrolls. The
            negative-then-positive horizontal padding keeps the scrollbar off
            the content while preserving the card's inner gutter. */}
        <div
          data-testid="tutorial-body"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-1 px-1"
        >
          <AnimatePresence mode="wait">
            <m.div
              key={currentStep}
              initial={{ opacity: 0, x: dir === 'rtl' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepBody()}
            </m.div>
          </AnimatePresence>
        </div>

        {/* Pinned footer — primary actions live here, always visible and never
            clipped, regardless of body length or viewport height. */}
        <div
          data-testid="tutorial-footer"
          className="shrink-0 pt-4 mt-4 border-t-2 border-neo-black/10 dark:border-white/10"
        >
          {renderStepFooter()}

          {/* Swipe hint indicator - only shown on mobile */}
          <div className="block sm:hidden text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
            {t('tutorial.swipeHint')}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 1: Guess the word — goal + live color legend.
// Body only; the "next" action is rendered in the modal's pinned footer.
const Step1Guess: React.FC = () => {
  const { t, language } = useLanguage();
  const example = getTutorialExample(language);

  return (
    <div>
      <TutorialHero
        src="/daily/tutorial/step1-guess.jpg"
        alt={t('tutorial.wordHunt.step1ImageAlt')}
      />
      <h2 className="text-2xl font-black mb-1 text-center">
        {t('tutorial.wordHunt.welcome.title')}
      </h2>
      <p className="text-center mb-4 text-gray-700 dark:text-gray-300">
        {t('tutorial.wordHunt.welcome.description')}
      </p>

      {/* Live colored tiles + compact legend (localized, not baked into the image) */}
      <div className="bg-slate-100 dark:bg-neo-navy-light rounded-neo border-2 border-neo-black p-3 mb-4">
        <div className="flex justify-center gap-1.5 mb-3">
          {example.feedback.map((tile, idx) => (
            <div
              key={`${tile.letter}-${idx}`}
              className={cn(
                'w-9 h-9 rounded-lg border-2 flex items-center justify-center font-black text-base shadow-hard-sm',
                TILE_COLORS[tile.state],
              )}
            >
              {tile.letter}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-3 text-xs font-bold flex-wrap">
          <span className="text-green-600 dark:text-green-400">
            🟩 {t('tutorial.wordHunt.letterFeedback.legendGreen')}
          </span>
          <span className="text-yellow-600 dark:text-yellow-400">
            🟨 {t('tutorial.wordHunt.letterFeedback.legendYellow')}
          </span>
          <span className="text-gray-500">
            ⬜ {t('tutorial.wordHunt.letterFeedback.legendGray')}
          </span>
        </div>
      </div>
    </div>
  );
};

// Step 2: Free bonus words — the twist that sets Word Hunt apart from Wordle.
// Body only; the back/continue actions live in the modal's pinned footer.
const Step2Bonus: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div>
      <TutorialHero
        src="/daily/tutorial/step2-bonus.jpg"
        alt={t('tutorial.wordHunt.step2ImageAlt')}
      />
      <h2 className="text-2xl font-black mb-3 text-center">
        {t('tutorial.wordHunt.bonusWordsTitle')}
      </h2>

      <div className="bg-gray-100 dark:bg-neo-navy-light rounded-neo border-2 border-neo-black p-4 mb-4 space-y-3">
        {/* Full-length word — costs a try */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 bg-neo-pink rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">-1</span>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('tutorial.wordHunt.triesRule.usesAttempt')}
          </div>
        </div>

        {/* Shorter word — free life + clues */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 bg-green-500 rounded-full flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-current" />
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('tutorial.wordHunt.triesRule.noAttempt')}
          </div>
        </div>
      </div>

      {/* Key takeaway */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-neo border-2 border-amber-300 dark:border-amber-700 p-3">
        <div className="text-sm font-bold text-center">
          {t('tutorial.wordHunt.triesRule.keyInsight')}
        </div>
      </div>
    </div>
  );
};

// Step 3: Ready to hunt.
// Body only; the start/back actions live in the modal's pinned footer.
const Step3Ready: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div>
      <TutorialHero
        src="/daily/tutorial/step3-ready.jpg"
        alt={t('tutorial.wordHunt.step3ImageAlt')}
      />
      <h2 className="text-3xl font-black mb-3 text-center">
        {t('tutorial.wordHunt.complete.title')}
      </h2>

      <div className="bg-slate-100 dark:bg-neo-navy-light rounded-neo border-2 border-slate-300 dark:border-slate-600 p-4 text-center">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {t('tutorial.wordHunt.complete.sameChallenge')}
        </div>
      </div>
    </div>
  );
};

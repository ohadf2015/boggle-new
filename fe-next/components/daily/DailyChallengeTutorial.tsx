'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Check, Heart, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { triggerHaptic } from '@/utils/hapticFeedback';

export interface DailyChallengeTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 5;

/**
 * Locale-aware example data for tutorial steps 3 (letter feedback) and 4
 * (tries rule). The colors in step 3 always teach the same lesson — the
 * letters just change to match the player's language. Hebrew/Swedish use
 * vetted vocabulary; Japanese keeps romaji because the live game does.
 *
 * `feedback`: per-tile { letter, state } where state ∈ {gray,green,yellow}.
 * `usesAttemptWord` / `noAttemptWord`: shown in step 4 to contrast a guess
 * that consumes a try vs. one that doesn't.
 */
type TileState = 'gray' | 'green' | 'yellow';
interface TutorialExample {
  feedback: ReadonlyArray<{ letter: string; state: TileState }>;
  usesAttemptWord: string;
  noAttemptWord: string;
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
    usesAttemptWord: 'BEACH',
    noAttemptWord: 'CAT',
  },
  es: {
    feedback: [
      { letter: 'P', state: 'gray' },
      { letter: 'L', state: 'green' },
      { letter: 'A', state: 'yellow' },
      { letter: 'Y', state: 'gray' },
      { letter: 'A', state: 'gray' },
    ],
    usesAttemptWord: 'PLAYA',
    noAttemptWord: 'SOL',
  },
  sv: {
    feedback: [
      { letter: 'S', state: 'gray' },
      { letter: 'O', state: 'green' },
      { letter: 'L', state: 'yellow' },
      { letter: 'E', state: 'gray' },
      { letter: 'N', state: 'gray' },
    ],
    usesAttemptWord: 'SOLEN',
    noAttemptWord: 'SOL',
  },
  // Hebrew uses 4-letter vetted vocabulary (no 5-letter words exist in the
  // tutorial vocab set). The lesson holds: "matching length uses a try,
  // shorter doesn't." Path/letter colors still teach the green/yellow rule.
  he: {
    feedback: [
      { letter: 'ש', state: 'gray' },
      { letter: 'מ', state: 'green' },
      { letter: 'ח', state: 'yellow' },
      { letter: 'ה', state: 'gray' },
    ],
    usesAttemptWord: 'דורש',
    noAttemptWord: 'לב',
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
    usesAttemptWord: 'BEACH',
    noAttemptWord: 'CAT',
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

  // Swipe gesture handlers
  const swipeHandlers = useSwipeGesture({
    onSwipe: (direction) => {
      if (direction === 'left') nextStep();
      else if (direction === 'right') prevStep();
    },
    threshold: 50,
  });

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Welcome onNext={nextStep} />;
      case 2:
        return <Step2WordDiscovery onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <Step3LetterFeedback onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <Step4MinimumLength onNext={nextStep} onPrev={prevStep} />;
      case 5:
        return <Step5Summary onNext={onComplete} onPrev={prevStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 text-white flex items-center justify-center z-[100] p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black max-w-lg w-full p-6 shadow-neo-brutalist relative"
        {...swipeHandlers}
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-neo-navy-light rounded-full transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
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

        {/* Step content with swipe support */}
        <AnimatePresence mode="wait">
          <m.div
            key={currentStep}
            initial={{ opacity: 0, x: dir === 'rtl' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </m.div>
        </AnimatePresence>

        {/* Swipe hint indicator - only shown on mobile */}
        <div className="block sm:hidden text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          {t('tutorial.swipeHint')}
        </div>
      </m.div>
    </div>
  );
};

// Step 1: Welcome
const Step1Welcome: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const { t } = useLanguage();

  return (
    <div className="text-center">
      <div className="text-6xl mb-4">🎯</div>
      <h2 className="text-3xl font-black mb-4">{t('tutorial.wordHunt.welcome.title')}</h2>
      <p className="text-lg mb-6">
        {t('tutorial.wordHunt.welcome.description')}
      </p>
      <Button onClick={onNext} className="w-full max-w-btn bg-neo-pink text-white">
        {t('tutorial.wordHunt.welcome.next')} <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
      </Button>
    </div>
  );
};

// Step 2: Word Discovery & Life System
const Step2WordDiscovery: React.FC<{ onNext: () => void; onPrev: () => void }> = ({
  onNext,
  onPrev,
}) => {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-black mb-4">{t('tutorial.wordHunt.lifeSystem.title')}</h2>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        {t('tutorial.wordHunt.lifeSystem.description')}
      </p>

      <div className="bg-gray-100 dark:bg-neo-navy-light rounded-neo border-2 border-neo-black p-4 mb-4">
        {/* Life bar example */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('tutorial.wordHunt.lifeSystem.lifeBarLabel')}</div>
          <div className="bg-gray-200 dark:bg-neo-navy-elevated rounded-full h-6 overflow-hidden border-2 border-neo-black">
            <div className="h-full bg-green-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: '85%' }}>
              <Heart className="w-3 h-3 me-1 fill-current" />
              85/100
            </div>
          </div>
        </div>

        {/* Tokens example */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('tutorial.wordHunt.lifeSystem.clueTokensLabel')}</div>
          <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-neo-black rounded-neo inline-flex">
            <Coins className="w-4 h-4 text-yellow-600" />
            <span className="font-bold text-sm">12</span>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded p-3 mb-3">
          <div className="text-sm font-bold mb-1">✓ {t('tutorial.wordHunt.lifeSystem.wordFound')}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {t('tutorial.wordHunt.lifeSystem.swipeToGain')} +15 ❤️ +2 🪙
          </div>
        </div>

      </div>

      <div className="flex gap-2">
        <Button onClick={onPrev} variant="outline" className="flex-1">
          ← {t('common.back')}
        </Button>
        <Button onClick={onNext} className="flex-1 bg-neo-pink text-white">
          {t('tutorial.wordHunt.lifeSystem.tryIt')} <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
};

// Step 3: Letter Feedback (Wordle-style colors) - Simplified visual-first approach
const Step3LetterFeedback: React.FC<{ onNext: () => void; onPrev: () => void }> = ({
  onNext,
  onPrev,
}) => {
  const { t, language } = useLanguage();
  const example = getTutorialExample(language);

  return (
    <div>
      <div className="text-center mb-4">
        <div className="text-5xl mb-2">🎯</div>
        <h2 className="text-2xl font-black mb-2">{t('tutorial.wordHunt.letterFeedback.title')}</h2>
      </div>

      {/* Example visual - self-explanatory */}
      <div className="bg-slate-100 dark:bg-neo-navy-light rounded-neo border-2 border-slate-300 dark:border-slate-600 p-4 mb-4">
        <div className="text-sm text-center text-slate-700 dark:text-slate-300 font-bold mb-3">
          {t('tutorial.wordHunt.letterFeedback.example')}
        </div>
        <div className="flex justify-center gap-1.5 mb-3">
          {example.feedback.map((tile, idx) => (
            <div
              key={`${tile.letter}-${idx}`}
              className={cn(
                'w-10 h-10 rounded-lg border-2 flex items-center justify-center font-black text-lg shadow-hard-sm',
                TILE_COLORS[tile.state],
              )}
            >
              {tile.letter}
            </div>
          ))}
        </div>
        {/* Compact legend */}
        <div className="flex justify-center gap-4 text-xs font-bold">
          <span className="text-green-600 dark:text-green-400">🟩 {t('tutorial.wordHunt.letterFeedback.legendGreen')}</span>
          <span className="text-yellow-600 dark:text-yellow-400">🟨 {t('tutorial.wordHunt.letterFeedback.legendYellow')}</span>
          <span className="text-gray-500">⬜ {t('tutorial.wordHunt.letterFeedback.legendGray')}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onPrev} variant="outline" className="flex-1">
          ← {t('common.back')}
        </Button>
        <Button onClick={onNext} className="flex-1 bg-neo-pink text-white">
          {t('tutorial.wordHunt.letterFeedback.gotIt')} <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
};

// Step 4: What Counts as a Try
const Step4MinimumLength: React.FC<{ onNext: () => void; onPrev: () => void }> = ({
  onNext,
  onPrev,
}) => {
  const { t, language } = useLanguage();
  const example = getTutorialExample(language);
  const targetLength = example.usesAttemptWord.length;

  return (
    <div>
      <div className="text-center mb-4">
        <div className="text-5xl mb-2">🎯</div>
        <h2 className="text-2xl font-black mb-2">
          {t('tutorial.wordHunt.triesRule.title')}
        </h2>
      </div>

      <p className="text-sm mb-4 text-center text-gray-600 dark:text-gray-300">
        {t('tutorial.wordHunt.triesRule.description')}
      </p>

      <div className="bg-gray-100 dark:bg-neo-navy-light rounded-neo border-2 border-neo-black p-4 mb-4 space-y-3">
        {/* Example: target word (length matches the locale's example word) */}
        <div className="text-center mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {t('tutorial.wordHunt.triesRule.exampleTarget')}
          </div>
          <div className="flex justify-center gap-1">
            {Array.from({ length: targetLength }).map((_, idx) => (
              <div key={`placeholder-${idx}`} className="w-8 h-8 bg-neo-black rounded border-2 border-neo-black flex items-center justify-center text-white font-bold text-sm">
                ?
              </div>
            ))}
          </div>
        </div>

        {/* Uses a try */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neo-pink text-neo-white rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">-1</span>
          </div>
          <div>
            <div className="font-bold text-neo-pink">{example.usesAttemptWord}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('tutorial.wordHunt.triesRule.usesAttempt')}
            </div>
          </div>
        </div>

        {/* Doesn't use a try */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-current" />
          </div>
          <div>
            <div className="font-bold text-green-600">{example.noAttemptWord}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('tutorial.wordHunt.triesRule.noAttempt')}
            </div>
          </div>
        </div>

        {/* NEW: Clue revelation benefit */}
        <div className="flex items-center gap-3 border-t border-gray-300 dark:border-gray-600 pt-3 mt-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">💡</span>
          </div>
          <div>
            <div className="font-bold text-yellow-600">{t('tutorial.wordHunt.triesRule.bonusTitle')}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('tutorial.wordHunt.triesRule.revealsClue')}
            </div>
          </div>
        </div>
      </div>

      {/* Key insight box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-neo border-2 border-amber-300 dark:border-amber-700 p-3 mb-4">
        <div className="text-sm font-bold text-center">
          {t('tutorial.wordHunt.triesRule.keyInsight')}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onPrev} variant="outline" className="flex-1">
          ← {t('common.back')}
        </Button>
        <Button onClick={onNext} className="flex-1 bg-neo-pink text-white">
          {t('tutorial.wordHunt.triesRule.gotIt')} <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
};

// Step 5: Summary & Start
const Step5Summary: React.FC<{ onNext: () => void; onPrev: () => void }> = ({
  onNext,
  onPrev,
}) => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="text-center mb-4">
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-3xl font-black mb-4">{t('tutorial.wordHunt.complete.title')}</h2>
      </div>

      <div className="bg-slate-100 dark:bg-neo-navy-light rounded-neo border-2 border-slate-300 dark:border-slate-600 p-4 mb-6 text-center">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {t('tutorial.wordHunt.complete.sameChallenge')}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onNext} className="w-full max-w-btn bg-neo-pink text-white text-lg py-6">
          {t('tutorial.wordHunt.complete.start')} 🚀
        </Button>
        <Button onClick={onPrev} variant="outline" size="sm">
          ← {t('common.back')}
        </Button>
      </div>
    </div>
  );
};

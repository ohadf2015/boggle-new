'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Tv, QrCode, LayoutGrid, Trophy, Timer, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TUTORIAL_STORAGE_KEY = 'lexiclash_tv_tutorial_complete';

interface TutorialStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  highlightArea: 'qr' | 'grid' | 'leaderboard' | 'timer' | 'fullscreen' | null;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    titleKey: 'tvTutorial.welcome.title',
    descriptionKey: 'tvTutorial.welcome.description',
    icon: <Tv className="w-12 h-12" />,
    highlightArea: null,
  },
  {
    id: 'qr',
    titleKey: 'tvTutorial.qr.title',
    descriptionKey: 'tvTutorial.qr.description',
    icon: <QrCode className="w-12 h-12" />,
    highlightArea: 'qr',
  },
  {
    id: 'grid',
    titleKey: 'tvTutorial.grid.title',
    descriptionKey: 'tvTutorial.grid.description',
    icon: <LayoutGrid className="w-12 h-12" />,
    highlightArea: 'grid',
  },
  {
    id: 'leaderboard',
    titleKey: 'tvTutorial.leaderboard.title',
    descriptionKey: 'tvTutorial.leaderboard.description',
    icon: <Trophy className="w-12 h-12" />,
    highlightArea: 'leaderboard',
  },
  {
    id: 'timer',
    titleKey: 'tvTutorial.timer.title',
    descriptionKey: 'tvTutorial.timer.description',
    icon: <Timer className="w-12 h-12" />,
    highlightArea: 'timer',
  },
  {
    id: 'exit',
    titleKey: 'tvTutorial.exit.title',
    descriptionKey: 'tvTutorial.exit.description',
    icon: <LogOut className="w-12 h-12" />,
    highlightArea: null,
  },
];

interface TvTutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  forceShow?: boolean; // Override localStorage check
}

/**
 * TvTutorialOverlay - Interactive step-by-step tutorial for TV broadcast mode
 * Shows first-time hosts how to use the TV display effectively
 */
const TvTutorialOverlay: React.FC<TvTutorialOverlayProps> = ({
  onComplete,
  onSkip,
  t,
  forceShow = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Check if tutorial should be shown
  // Tutorial is controlled by parent component via forceShow prop
  // No auto-show logic - parent decides when to show based on user actions
  useEffect(() => {
    setIsVisible(forceShow);
  }, [forceShow]);

  // Mark tutorial as complete
  const markComplete = useCallback(() => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete tutorial
      markComplete();
      setIsVisible(false);
      onComplete();
    }
  }, [currentStep, markComplete, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    markComplete();
    setIsVisible(false);
    onSkip();
  }, [markComplete, onSkip]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleNext, handlePrev, handleSkip]);

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label={t('tvTutorial.ariaLabel')}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-neo-black/90" />

        {/* Tutorial card */}
        <m.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative z-10 w-full max-w-lg mx-4 bg-neo-cream rounded-neo-lg border-4 border-neo-black shadow-hard-lg overflow-hidden"
        >
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 p-2 text-neo-black/60 hover:text-neo-black hover:bg-neo-black/10 rounded-neo transition-colors"
            aria-label={t('common.skip')}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress indicator */}
          <div className="flex gap-1 px-6 pt-4">
            {TUTORIAL_STEPS.map((s, index) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-neo-purple' : 'bg-neo-black/20'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-6 pt-4">
            {/* Icon */}
            <m.div
              key={step.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex justify-center mb-4"
            >
              <div className="w-20 h-20 rounded-full bg-neo-purple/20 border-3 border-neo-purple flex items-center justify-center text-neo-purple">
                {step.icon}
              </div>
            </m.div>

            {/* Title */}
            <m.h2
              key={`title-${step.id}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
              className="text-2xl font-black text-neo-black text-center mb-3"
            >
              {t(step.titleKey)}
            </m.h2>

            {/* Description */}
            <m.p
              key={`desc-${step.id}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
              className="text-neo-black/80 text-center mb-6 leading-relaxed"
            >
              {t(step.descriptionKey)}
            </m.p>

            {/* Step indicator */}
            <p className="text-center text-sm text-neo-black/50 mb-4">
              {currentStep + 1} / {TUTORIAL_STEPS.length}
            </p>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <Button
                  onClick={handlePrev}
                  variant="outline"
                  className="flex-1 py-3 border-2 border-neo-black bg-neo-cream hover:bg-neo-black/10 text-neo-black font-bold"
                >
                  <ChevronLeft className="w-5 h-5 me-1 rtl:rotate-180" />
                  {t('common.previous')}
                </Button>
              )}
              <Button
                onClick={handleNext}
                className={`${isFirstStep ? 'w-full' : 'flex-1'} py-3 bg-neo-purple hover:bg-neo-purple/90 text-neo-cream font-bold border-2 border-neo-black shadow-hard-sm`}
              >
                {isLastStep ? (t('tvTutorial.letsGo')) : (t('common.next'))}
                {!isLastStep && <ChevronRight className="w-5 h-5 ms-1 rtl:rotate-180" />}
              </Button>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
};

/**
 * Check if TV tutorial has been completed
 */
export const isTvTutorialComplete = (): boolean => {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Reset TV tutorial completion status (for help button)
 */
export const resetTvTutorial = (): void => {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};

/**
 * TvHelpButton - Small button to re-show tutorial
 */
export const TvHelpButton: React.FC<{
  onClick: () => void;
  t: (path: string) => string;
}> = ({ onClick, t }) => (
  <m.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="p-2 bg-neo-black/60 hover:bg-neo-black/80 text-neo-cream rounded-neo border-2 border-neo-cream/30 shadow-hard-sm transition-colors"
    title={t('tvTutorial.help')}
    aria-label={t('tvTutorial.help')}
  >
    <HelpCircle className="w-5 h-5" />
  </m.button>
);

export default TvTutorialOverlay;

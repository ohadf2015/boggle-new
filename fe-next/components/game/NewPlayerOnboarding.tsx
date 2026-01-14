'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Hand, Trophy, Zap, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewPlayerOnboardingProps {
  t: (path: string, params?: Record<string, string | number>) => string;
  onDismiss: () => void;
  className?: string;
}

interface OnboardingStep {
  icon: React.ReactNode;
  titleKey: string;
  textKey: string;
  fallbackTitle: string;
  fallbackText: string;
  visual?: React.ReactNode;
}

// Mini swipe demo showing the mechanic visually
const SwipeDemo = () => (
  <div className="relative w-24 h-24 mx-auto mt-2">
    {/* Mini 2x2 grid */}
    <div className="grid grid-cols-2 gap-1">
      {['C', 'A', 'R', 'T'].map((letter, i) => (
        <motion.div
          key={i}
          className={cn(
            'w-11 h-11 flex items-center justify-center rounded-md',
            'text-lg font-bold',
            // Highlighted letters: bright cyan bg with dark text for high contrast
            i <= 2 ? 'bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard-sm' : 'bg-slate-700/50 text-neo-cream/50 border border-slate-600'
          )}
          animate={i <= 2 ? { scale: [1, 1.1, 1] } : undefined}
          transition={{ delay: i * 0.3, duration: 0.4, repeat: i <= 2 ? Infinity : 0, repeatDelay: 1.5 }}
        >
          {letter}
        </motion.div>
      ))}
    </div>
    {/* Animated line showing swipe path */}
    <motion.svg
      className="absolute inset-0 pointer-events-none"
      viewBox="0 0 96 96"
    >
      <motion.path
        d="M 24 24 L 72 24 L 24 72"
        fill="none"
        stroke="#1a1a2e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
      />
    </motion.svg>
  </div>
);

// Combined scoring visual showing points + combo + unique
const ScoringAndTipsVisual = () => (
  <div className="space-y-3 mt-2">
    {/* Scoring chart */}
    <div className="flex items-end justify-center gap-1.5">
      {[
        { letters: 3, points: 1, color: 'bg-slate-400' },
        { letters: 4, points: 2, color: 'bg-neo-cyan' },
        { letters: 5, points: 4, color: 'bg-neo-lime' },
        { letters: 6, points: 8, color: 'bg-neo-yellow' },
        { letters: '7+', points: '16+', color: 'bg-neo-orange' },
      ].map((item, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
          className="flex flex-col items-center origin-bottom"
        >
          <span className="text-[10px] font-bold text-neo-cream mb-0.5">+{item.points}</span>
          <div
            className={cn('w-7 rounded-t-sm border-2 border-neo-black/50', item.color)}
            style={{ height: `${18 + i * 6}px` }}
          />
          <span className="text-[9px] font-bold text-neo-cream/80 mt-0.5">{item.letters}</span>
        </motion.div>
      ))}
    </div>
    {/* Tips row - improved contrast */}
    <div className="flex justify-center gap-4 text-[10px]">
      <div className="flex items-center gap-1 bg-neo-yellow/20 px-2 py-1 rounded-neo">
        <Zap className="w-3 h-3 text-neo-yellow" />
        <span className="text-neo-cream font-bold">Fast = Combo</span>
      </div>
      <div className="flex items-center gap-1 bg-neo-pink/20 px-2 py-1 rounded-neo">
        <Target className="w-3 h-3 text-neo-pink" />
        <span className="text-neo-cream font-bold">Unique = Points</span>
      </div>
    </div>
  </div>
);

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: <Hand className="w-8 h-8" />,
    titleKey: 'onboarding.step1Title',
    textKey: 'onboarding.step1Text',
    fallbackTitle: 'Swipe Letters',
    fallbackText: 'Drag across connected letters to form words.',
    visual: <SwipeDemo />,
  },
  {
    icon: <Trophy className="w-8 h-8" />,
    titleKey: 'onboarding.step2Title',
    textKey: 'onboarding.step2Text',
    fallbackTitle: 'Score Points',
    fallbackText: 'Longer words = way more points. Find unique words!',
    visual: <ScoringAndTipsVisual />,
  },
];

const STORAGE_KEY = 'lexiclash_seen_onboarding';

export function NewPlayerOnboarding({ t, onDismiss, className }: NewPlayerOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Check if user has seen onboarding before
  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (hasSeen === 'true') {
      setIsVisible(false);
      onDismiss();
    }
  }, [onDismiss]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    onDismiss();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4',
          'bg-neo-black/80 backdrop-blur-sm',
          className
        )}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className={cn(
            'relative w-full max-w-sm',
            'bg-slate-800 rounded-neo-lg',
            'border-4 border-neo-black shadow-hard-lg',
            'p-6'
          )}
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-3 end-3 p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-700 transition-colors"
            aria-label={t('common.close') || 'Close'}
          >
            <X className="w-4 h-4 text-neo-cream/70" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-neo-yellow" />
            <span className="text-sm font-bold uppercase tracking-wide text-neo-yellow">
              {t('onboarding.header') || 'How to Play'}
            </span>
          </div>

          {/* Timing hint */}
          <p className="text-xs text-neo-cream/50 mb-3 text-center">
            {t('onboarding.timingHint') || 'Learn while waiting for the game to start!'}
          </p>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              {/* Icon */}
              <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-neo-cyan/20 border-3 border-neo-cyan/40 flex items-center justify-center text-neo-cyan">
                {step.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-neo-white mb-2">
                {t(step.titleKey) || step.fallbackTitle}
              </h3>

              {/* Text */}
              <p className="text-neo-cream/80 text-sm leading-relaxed">
                {t(step.textKey) || step.fallbackText}
              </p>

              {/* Optional visual (e.g., scoring chart) */}
              {step.visual && (
                <div className="mt-2 mb-4">
                  {step.visual}
                </div>
              )}

              {/* Spacer when no visual */}
              {!step.visual && <div className="mb-6" />}
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-4">
            {ONBOARDING_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentStep
                    ? 'bg-neo-cyan w-6'
                    : index < currentStep
                    ? 'bg-neo-lime'
                    : 'bg-slate-600'
                )}
                aria-label={`Step ${index + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="default"
              onClick={handleSkip}
              className="flex-1 text-neo-cream/70 hover:text-neo-cream"
            >
              {t('onboarding.skip') || 'Skip'}
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={handleNext}
              className="flex-1 bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black font-bold"
            >
              {isLastStep
                ? t('onboarding.letsPlay') || "Let's Play!"
                : t('common.next') || 'Next'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default NewPlayerOnboarding;

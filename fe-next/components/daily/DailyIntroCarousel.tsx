'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Hand } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { triggerHaptic } from '@/utils/hapticFeedback';

export interface DailyIntroCarouselProps {
  targetWordLength: number;
  className?: string;
}

const TOTAL_STEPS = 2;
const AUTO_ADVANCE_DELAY = 5000; // 5 seconds
const PAUSE_AFTER_INTERACTION = 3000; // Resume after 3s of no interaction

export const DailyIntroCarousel: React.FC<DailyIntroCarouselProps> = ({
  targetWordLength,
  className,
}) => {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const startAutoAdvance = useCallback(() => {
    clearTimers();
    if (!isPaused) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % TOTAL_STEPS);
      }, AUTO_ADVANCE_DELAY);
    }
  }, [isPaused, clearTimers]);

  const pauseForInteraction = useCallback(() => {
    setIsPaused(true);
    clearTimers();
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, PAUSE_AFTER_INTERACTION);
  }, [clearTimers]);

  const goToStep = useCallback((step: number) => {
    triggerHaptic('swipe');
    pauseForInteraction();
    setCurrentStep(step);
  }, [pauseForInteraction]);

  const nextStep = useCallback(() => {
    goToStep((currentStep + 1) % TOTAL_STEPS);
  }, [currentStep, goToStep]);

  const prevStep = useCallback(() => {
    goToStep((currentStep - 1 + TOTAL_STEPS) % TOTAL_STEPS);
  }, [currentStep, goToStep]);

  // Auto-advance timer
  useEffect(() => {
    startAutoAdvance();
    return clearTimers;
  }, [currentStep, isPaused, startAutoAdvance, clearTimers]);

  // Swipe gesture handlers
  const swipeHandlers = useSwipeGesture({
    onSwipe: (direction) => {
      if (direction === 'left') nextStep();
      else if (direction === 'right') prevStep();
    },
    threshold: 50,
  });

  return (
    <div
      className={cn(
        'w-full max-w-md mx-auto',
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 text-center">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {t('daily.carousel.header')}
        </h3>
      </div>

      {/* Carousel Content */}
      <div
        className="relative overflow-hidden rounded-neo-lg border-3 border-neo-black bg-white dark:bg-neo-navy shadow-hard-lg h-[200px] sm:h-[220px]"
        {...swipeHandlers}
      >
        <AnimatePresence mode="wait">
          <m.div
            key={currentStep}
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="absolute inset-0 p-4 flex flex-col"
          >
            {currentStep === 0 && <Step1SwipeAndColors isRTL={isRTL} t={t} />}
            {currentStep === 1 && <Step2FindWordAndClues targetWordLength={targetWordLength} t={t} />}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center gap-2 mt-3">
        {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
          <button
            type="button"
            key={`step-${idx}`}
            aria-label={t('daily.carousel.goToStep').replace('{step}', String(idx + 1))}
            onClick={() => goToStep(idx)}
            className={cn(
              'rounded-full border-2 border-neo-black transition-all duration-200 shrink-0 aspect-square',
              idx === currentStep
                ? 'w-4 h-4 bg-neo-pink'
                : 'w-3 h-3 bg-gray-300 hover:bg-neo-pink/30'
            )}
          />
        ))}
      </div>
    </div>
  );
};

// Step 1: Combined Swipe Demo + Color Feedback
const Step1SwipeAndColors: React.FC<{ isRTL: boolean; t: (key: string) => string }> = ({ isRTL, t }) => {
  // Grid letters from translation
  const letters = (t('daily.carousel.step1Grid') || '').split(',');
  const highlightedIndices = (t('daily.carousel.step1Highlighted') || '').split(',').map(Number);

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0">
      <div className="text-sm sm:text-base font-bold text-neo-pink dark:text-neo-pink-light">
        {t('daily.carousel.step1Title')}
      </div>

      {/* Mini Grid with Animated Swipe */}
      <div className="relative inline-block shrink-0">
        <div className="grid grid-cols-3 gap-1">
          {letters.map((letter, idx) => (
            <m.div
              key={`letter-${idx}-${letter}`}
              className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-neo-black flex items-center justify-center font-bold text-base sm:text-lg',
                highlightedIndices.includes(idx)
                  ? 'bg-neo-lime text-neo-black shadow-[2px_2px_0px_rgb(0,0,0)]'
                  : 'bg-neo-cream dark:bg-neo-navy-elevated text-neo-black dark:text-white'
              )}
              animate={highlightedIndices.includes(idx) ? {
                scale: [1, 1.1, 1],
                transition: {
                  delay: highlightedIndices.indexOf(idx) * 0.2,
                  duration: 0.3,
                  repeat: Infinity,
                  repeatDelay: 3
                }
              } : {}}
            >
              {letter}
            </m.div>
          ))}
        </div>

        {/* Animated Finger */}
        <m.div
          className="absolute pointer-events-none"
          style={{ top: 0, left: 0 }}
          initial={{ x: isRTL ? 85 : 8, y: 8, opacity: 0 }}
          animate={{
            x: isRTL ? [85, 45, 45, 45] : [8, 45, 45, 45],
            y: [8, 8, 45, 85],
            opacity: [0, 1, 1, 1, 1, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatDelay: 1.5,
            ease: 'easeInOut',
          }}
        >
          <Hand className="w-6 h-6 text-neo-black dark:text-neo-black fill-white dark:fill-neo-cream stroke-[2.5]" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
        </m.div>
      </div>

      {/* Color Legend - Compact */}
      <div className="flex justify-center gap-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500 border-2 border-neo-black" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">{t('daily.carousel.step2Green')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-400 border-2 border-neo-black" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">{t('daily.carousel.step2Yellow')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-400 border-2 border-neo-black" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">{t('daily.carousel.step2Gray')}</span>
        </div>
      </div>
    </div>
  );
};

// Step 2: Combined Find Word + Clue Revelation
const Step2FindWordAndClues: React.FC<{ targetWordLength: number; t: (key: string, params?: Record<string, string | number>) => string }> = ({
  targetWordLength,
  t
}) => {
  const displayLength = Math.max(targetWordLength, 4);

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0">
      <div className="text-sm sm:text-base font-bold text-neo-pink dark:text-neo-pink-light">
        {t('daily.carousel.step3Title')}
      </div>

      {/* Target word boxes */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="flex justify-center gap-1.5 sm:gap-2">
          {Array.from({ length: displayLength }).map((_, idx) => (
            <m.div
              key={`target-box-${idx}`}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-neo-black border-2 border-neo-black flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-[2px_2px_0px_rgb(0,0,0)]"
              initial={{ scale: 0, rotateY: 90 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{
                delay: idx * 0.08,
                type: 'spring',
                stiffness: 380,
                damping: 26,
              }}
            >
              <m.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.1 }}
              >
                ?
              </m.span>
            </m.div>
          ))}
        </div>

        {/* Word discovery example - compact */}
        <m.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 26 }}
        >
          <div className="flex gap-1">
            {['C', 'A', 'T'].map((letter, idx) => (
              <div
                key={`cat-${idx}-${letter}`}
                className="w-6 h-6 rounded-lg border-2 border-neo-black bg-neo-lime flex items-center justify-center font-bold text-xs text-neo-black shadow-[2px_2px_0px_rgb(0,0,0)]"
              >
                {letter}
              </div>
            ))}
          </div>
          <span className="text-base">→</span>
          <span className="text-base">💡</span>
        </m.div>
      </div>

      {/* Description */}
      <div className="text-center space-y-1">
        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">
          {t('daily.carousel.step3Desc')}
        </div>
        <div className="text-[10px] sm:text-xs text-neo-pink dark:text-neo-pink-light font-bold">
          {t('daily.carousel.step4Desc')}
        </div>
      </div>
    </div>
  );
};

export default DailyIntroCarousel;

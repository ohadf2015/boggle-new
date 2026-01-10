'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { triggerHaptic } from '@/utils/hapticFeedback';

export interface DailyIntroCarouselProps {
  targetWordLength: number;
  className?: string;
}

const TOTAL_STEPS = 4;
const AUTO_ADVANCE_DELAY = 4500; // 4.5 seconds
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
    onSwipeLeft: nextStep,
    onSwipeRight: prevStep,
    isRtl: isRTL,
    enableHaptic: false,
    threshold: 50,
  });

  return (
    <div
      className={cn(
        'w-full max-w-md mx-auto',
        className
      )}
      {...swipeHandlers}
    >
      {/* Carousel Content */}
      <div className="relative overflow-hidden rounded-neo-lg border-3 border-neo-black bg-white dark:bg-neo-navy shadow-hard-lg h-[200px] sm:h-[220px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 p-4 flex flex-col"
          >
            {currentStep === 0 && <Step1SwipeDemo isRTL={isRTL} t={t} />}
            {currentStep === 1 && <Step2ColorFeedback t={t} />}
            {currentStep === 2 && <Step3FindWord targetWordLength={targetWordLength} t={t} />}
            {currentStep === 3 && <Step4ClueRevelation t={t} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Indicators - Neo-Brutalist Circles */}
      <div className="flex items-center justify-center gap-3 mt-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            className={cn(
              'w-3 h-3 min-w-3 min-h-3 flex-none rounded-full border-2 border-neo-black transition-all duration-300 ease-out',
              i === currentStep
                ? 'bg-neo-pink scale-125 shadow-[2px_2px_0px_rgb(0,0,0)]'
                : 'bg-neo-cream dark:bg-gray-600 hover:bg-neo-pink/30 hover:scale-110'
            )}
            aria-label={t('daily.carousel.goToStep', { step: i + 1 }) || `Go to step ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

// Step 1: Animated Swipe Demo - Shows 4-letter word in L-shape (translated per language)
const Step1SwipeDemo: React.FC<{ isRTL: boolean; t: (key: string) => string }> = ({ isRTL, t }) => {
  // Grid letters from translation (defaults to CATS pattern if not translated)
  const letters = (t('daily.carousel.step1Grid') || 'C,A,O,G,T,E,D,S,R').split(',');
  // Highlight indices from translation (defaults to 0,1,4,7 for L-shape pattern)
  const highlightedIndices = (t('daily.carousel.step1Highlighted') || '0,1,4,7').split(',').map(Number);

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0">
      <div className="text-sm sm:text-base font-bold text-neo-pink dark:text-neo-pink-light">
        {t('daily.carousel.step1Title') || 'Swipe to Find Words'}
      </div>

      {/* Mini Grid with Animated Swipe */}
      <div className="relative inline-block flex-shrink-0">
        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-1">
          {letters.map((letter, idx) => (
            <motion.div
              key={idx}
              className={cn(
                'w-10 h-10 sm:w-11 sm:h-11 rounded-lg border-2 border-neo-black flex items-center justify-center font-bold text-lg sm:text-xl',
                highlightedIndices.includes(idx)
                  ? 'bg-neo-lime text-neo-black shadow-[2px_2px_0px_rgb(0,0,0)]'
                  : 'bg-neo-cream dark:bg-gray-700 text-neo-black dark:text-white'
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
            </motion.div>
          ))}
        </div>

        {/* Animated Finger - L-shape path following CATS */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ top: 0, left: 0 }}
          initial={{ x: isRTL ? 95 : 8, y: 8, opacity: 0 }}
          animate={{
            x: isRTL ? [95, 50, 50, 50] : [8, 50, 50, 50],
            y: [8, 8, 50, 95],
            opacity: [0, 1, 1, 1, 1, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatDelay: 1.5,
            ease: 'easeInOut',
          }}
        >
          <Hand className="w-7 h-7 text-neo-black dark:text-neo-black fill-white dark:fill-neo-cream stroke-[2.5]" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
        </motion.div>
      </div>

      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">
        {t('daily.carousel.step1Desc') || 'Connect letters in any direction'}
      </div>
    </div>
  );
};

// Step 2: Color Feedback Animation
const Step2ColorFeedback: React.FC<{ t: (key: string) => string }> = ({ t }) => {
  // Use translated letters and colors (defaults to GAME if not translated)
  const letters = (t('daily.carousel.step2Letters') || 'G,A,M,E').split(',');
  const colors = (t('daily.carousel.step2Colors') || 'green,yellow,gray,green').split(',');

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0">
      <div className="text-sm sm:text-base font-bold text-neo-pink dark:text-neo-pink-light">
        {t('daily.carousel.step2Title') || 'Color Clues'}
      </div>

      {/* Letter tiles with animated color reveal */}
      <div className="flex justify-center gap-1.5 sm:gap-2 flex-shrink-0">
        {letters.map((letter, idx) => (
          <motion.div
            key={idx}
            className={cn(
              'w-10 h-10 sm:w-11 sm:h-11 rounded-lg border-2 border-neo-black flex items-center justify-center font-bold text-lg sm:text-xl text-white shadow-[2px_2px_0px_rgb(0,0,0)]',
              colors[idx] === 'green' && 'bg-emerald-500',
              colors[idx] === 'yellow' && 'bg-amber-400 text-neo-black',
              colors[idx] === 'gray' && 'bg-gray-400'
            )}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{
              rotateY: 0,
              opacity: 1,
              scale: colors[idx] === 'green' ? [1, 1.1, 1] : 1,
            }}
            transition={{
              delay: idx * 0.2,
              duration: 0.3,
              scale: { delay: idx * 0.2 + 0.3, duration: 0.2, repeat: Infinity, repeatDelay: 3 }
            }}
          >
            {letter}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-emerald-500 border-2 border-neo-black" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">{t('daily.carousel.step2Green') || 'Right spot'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-amber-400 border-2 border-neo-black" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">{t('daily.carousel.step2Yellow') || 'Wrong spot'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-gray-400 border-2 border-neo-black" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">{t('daily.carousel.step2Gray') || 'Not in word'}</span>
        </div>
      </div>
    </div>
  );
};

// Step 3: Find the Hidden Word
const Step3FindWord: React.FC<{ targetWordLength: number; t: (key: string, params?: Record<string, string | number>) => string }> = ({
  targetWordLength,
  t
}) => {
  // Always show at least 4 boxes in the tutorial
  const displayLength = Math.max(targetWordLength, 4);

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0">
      <div className="text-sm sm:text-base font-bold text-neo-pink dark:text-neo-pink-light">
        {t('daily.carousel.step3Title') || 'Find the Hidden Word'}
      </div>

      {/* Target word boxes */}
      <div className="flex justify-center gap-1.5 sm:gap-2 flex-shrink-0">
        {Array.from({ length: displayLength }).map((_, idx) => (
          <motion.div
            key={idx}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-neo-black border-2 border-neo-black flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-[2px_2px_0px_rgb(0,0,0)]"
            initial={{ scale: 0, rotateY: 90 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{
              delay: idx * 0.08,
              type: 'spring',
              stiffness: 300
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.1 }}
            >
              ?
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Attempts indicator */}
      <div className="flex flex-col items-center gap-1">
        <motion.div
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-neo-cream dark:bg-gray-700 rounded-full border-2 border-neo-black shadow-[2px_2px_0px_rgb(0,0,0)]"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neo-pink dark:text-neo-pink-light" />
          <span className="text-xs sm:text-sm font-bold text-neo-black dark:text-white">
            {t('daily.carousel.step3Desc') || '10 tries to crack the code'}
          </span>
        </motion.div>

        <div className="text-[10px] sm:text-xs text-neo-pink dark:text-neo-pink-light font-bold">
          {t('daily.carousel.step3Hint', { length: targetWordLength }) || `Guess ${targetWordLength}-letter words to reveal clues`}
        </div>
      </div>
    </div>
  );
};

// Step 4: Clue Revelation from Discovered Words
const Step4ClueRevelation: React.FC<{ t: (key: string) => string }> = ({ t }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0">
      <div className="text-sm sm:text-base font-bold text-neo-pink dark:text-neo-pink-light">
        {t('daily.carousel.step4Title') || 'Discover Words, Reveal Clues'}
      </div>

      {/* Visual demonstration */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {/* Example word discovery */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex gap-1">
            {['C', 'A', 'T'].map((letter, idx) => (
              <motion.div
                key={idx}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 border-neo-black bg-neo-lime flex items-center justify-center font-bold text-xs sm:text-sm text-neo-black shadow-[2px_2px_0px_rgb(0,0,0)]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.1, type: 'spring' }}
              >
                {letter}
              </motion.div>
            ))}
          </div>
          <motion.span
            className="text-lg sm:text-xl"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            💡
          </motion.span>
        </motion.div>

        {/* Arrow */}
        <motion.div
          className="text-neo-pink dark:text-neo-pink-light text-xl sm:text-2xl leading-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          ↓
        </motion.div>

        {/* Revealed clue boxes */}
        <motion.div
          className="flex gap-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          {[
            { letter: 'C', type: 'green' },
            { letter: 'A', type: 'yellow' },
            { letter: '?', type: 'unknown' },
            { letter: 'T', type: 'green' },
          ].map((box, idx) => (
            <motion.div
              key={idx}
              className={cn(
                'w-8 h-8 sm:w-9 sm:h-9 rounded-lg border-2 border-neo-black flex items-center justify-center font-bold text-xs sm:text-sm shadow-[2px_2px_0px_rgb(0,0,0)]',
                box.type === 'green' && 'bg-green-500 text-neo-black',
                box.type === 'yellow' && 'bg-yellow-500 text-neo-black',
                box.type === 'unknown' && 'bg-neo-black text-white'
              )}
              initial={{ scale: 0, rotateY: 90 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ delay: 1.3 + idx * 0.1, type: 'spring' }}
            >
              {box.letter}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Description */}
      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">
        {t('daily.carousel.step4Desc') || 'Every word 3+ letters reveals clues!'}
      </div>
    </div>
  );
};

export default DailyIntroCarousel;

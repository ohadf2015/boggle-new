'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  onComplete: () => void;
  isVeteran?: boolean;
  onStepChange?: (step: number) => void;
};

type FtueStep = 1 | 2 | 3 | 4 | 5 | 6;

export function BlastFtueOverlay({ onComplete, isVeteran, onStepChange }: Props) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<FtueStep>(1);
  const [skipTimeout, setSkipTimeout] = useState(false);

  useEffect(() => onStepChange?.(step), [step, onStepChange]);

  const handleDragStart = () => {
    if (step === 1) setStep(2);
  };

  const handleWordFound = () => {
    if (step === 2) {
      setStep(3);
      setSkipTimeout(true);
      const timeout = setTimeout(() => {
        setStep(4);
        setSkipTimeout(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
    if (step === 4) {
      setStep(5);
    }
    if (step === 5) {
      setStep(6);
    }
  };

  const handleLevelComplete = () => {
    if (step === 6) {
      onComplete();
    }
  };

  if (isVeteran) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
      >
        <motion.div
          className="bg-[#0b1530] border-neo-thick border-black rounded-neo p-6 max-w-sm text-center text-white space-y-4"
          initial={{ scale: reducedMotion?.prefersReducedMotion ? 1 : 0.9 }}
          animate={{ scale: 1 }}
        >
          <div className="text-2xl font-bold">
            {t('blast.tutorial.veteran.title', 'Welcome back!')}
          </div>
          <p className="text-sm">
            {t('blast.tutorial.veteran.body', 'Blast has been redesigned. Enjoy the new levels!')}
          </p>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-neo-pink border-neo-thick border-black rounded-neo font-bold"
          >
            {t('blast.tutorial.veteran.cta', "Let's go")}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {step === 1 && (
        <motion.div
          key="step-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={handleDragStart}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center">
            <div className="text-white text-lg">
              {t('blast.tutorial.ftue.step1', 'Drag across letters to spell a word')}
            </div>
            <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24">
              <path d="M3 12h18M12 3v18" stroke="white" strokeWidth="2" />
            </svg>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          key="step-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-lg">
              {t('blast.tutorial.ftue.step2', 'Try it: drag from C to T')}
            </div>
            {!reducedMotion?.prefersReducedMotion && (
              <motion.svg
                className="w-16 h-16 mx-auto"
                viewBox="0 0 100 100"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <path d="M 20 50 Q 50 30, 80 50" stroke="white" strokeWidth="3" fill="none" />
              </motion.svg>
            )}
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          key="step-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-lg">
              {t('blast.tutorial.ftue.step3', 'Letters above fall to fill the space')}
            </div>
            <div className="text-xs opacity-70">
              {!reducedMotion?.prefersReducedMotion
                ? t('blast.tutorial.ftue.step3.hint', 'Watch the animation')
                : t('blast.tutorial.ftue.step3.hint', 'Letters fall down')}
            </div>
            {skipTimeout && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
              >
                ✓
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div
          key="step-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-lg font-bold">
              {t('blast.tutorial.ftue.step4', 'Find 3 ANIMAL words')}
            </div>
            <div className="flex justify-center gap-2">
              <span className="text-2xl">●</span>
              <span className="text-2xl opacity-30">○</span>
              <span className="text-2xl opacity-30">○</span>
            </div>
          </div>
        </motion.div>
      )}

      {step === 5 && (
        <motion.div
          key="step-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-lg">
              {t('blast.tutorial.ftue.step5', 'Or tap each letter, double-tap to confirm')}
            </div>
            {!reducedMotion?.prefersReducedMotion && (
              <motion.svg
                className="w-16 h-16 mx-auto"
                viewBox="0 0 100 100"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <circle cx="50" cy="50" r="20" fill="white" opacity="0.5" />
              </motion.svg>
            )}
          </div>
        </motion.div>
      )}

      {step === 6 && (
        <motion.div
          key="step-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleLevelComplete}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
        >
          <div className="space-y-4 text-center text-white">
            <div className="text-2xl font-bold">
              {t('blast.tutorial.ftue.step6', 'Level 1! Watch your chest bar →')}
            </div>
            <div className="text-sm opacity-70">
              {t('blast.tutorial.ftue.step6.hint', 'Tap to continue')}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  onComplete: () => void;
  isVeteran?: boolean;
  onStepChange?: (step: number) => void;
  selectionActive?: boolean;
  wordsFoundCount?: number;
  levelComplete?: boolean;
};

type FtueStep = 1 | 2 | 3 | 4 | 5 | 6;

export function BlastFtueOverlay({
  onComplete,
  isVeteran,
  onStepChange,
  selectionActive = false,
  wordsFoundCount = 0,
  levelComplete = false,
}: Props) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<FtueStep>(1);

  useEffect(() => onStepChange?.(step), [step, onStepChange]);

  // Step 2: advance when the user starts dragging on the board.
  useEffect(() => {
    if (step === 2 && selectionActive) setStep(3);
  }, [step, selectionActive]);

  // Step 3 → 4: brief acknowledgement of cascade animation.
  useEffect(() => {
    if (step !== 3) return;
    const id = setTimeout(() => setStep(4), 1800);
    return () => clearTimeout(id);
  }, [step]);

  // Step 4+: advance with words found.
  useEffect(() => {
    if (step === 4 && wordsFoundCount >= 1) setStep(5);
    if (step === 5 && wordsFoundCount >= 2) setStep(6);
  }, [step, wordsFoundCount]);

  // Step 6: complete on level done.
  useEffect(() => {
    if (step === 6 && levelComplete) onComplete();
  }, [step, levelComplete, onComplete]);

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
          initial={{ scale: reducedMotion === true ? 1 : 0.9 }}
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

  // Step 1 is a full-screen modal: blocks the board, dismissed by tap.
  // Steps 2–6 are coach marks at the top of the screen with pointer-events-none
  // on the backdrop so the player can interact with the board underneath.
  return (
    <AnimatePresence>
      {step === 1 && (
        <motion.div
          key="step-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={() => setStep(2)}
          className="fixed inset-0 flex items-center justify-center bg-black/75 z-50 px-6"
        >
          <div className="space-y-5 text-center max-w-sm">
            <div className="text-white text-xl font-bold">
              {t('blast.tutorial.ftue.step1', 'Drag across letters to spell a word')}
            </div>
            <svg className="w-14 h-14 mx-auto" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M12 3v18" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="text-white/70 text-sm">
              {t('blast.tutorial.ftue.step1Cta', 'Tap to begin')}
            </div>
          </div>
        </motion.div>
      )}

      {step >= 2 && step <= 6 && (
        <motion.div
          key={`coach-${step}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          data-testid={`ftue-coach-step-${step}`}
          className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
        >
          <div className="pointer-events-auto bg-[#0b1530]/95 border-2 border-white/20 rounded-xl px-4 py-3 max-w-[20rem] text-center text-white shadow-lg space-y-1">
            {step === 2 && (
              <>
                <div className="text-sm font-semibold">
                  {t('blast.tutorial.ftue.step2', 'Try it: drag from C to T')}
                </div>
                <div className="text-xs text-white/70">
                  {t('blast.tutorial.ftue.step2Hint', 'Letters must be adjacent')}
                </div>
              </>
            )}
            {step === 3 && (
              <div className="text-sm font-semibold">
                {t('blast.tutorial.ftue.step3', 'Letters above fall to fill the space')}
              </div>
            )}
            {step === 4 && (
              <>
                <div className="text-sm font-semibold">
                  {t('blast.tutorial.ftue.step4', 'Find 3 ANIMAL words')}
                </div>
                <div className="flex justify-center gap-1 pt-1" aria-hidden>
                  <span className="text-base">●</span>
                  <span className="text-base opacity-30">○</span>
                  <span className="text-base opacity-30">○</span>
                </div>
              </>
            )}
            {step === 5 && (
              <div className="text-sm font-semibold">
                {t('blast.tutorial.ftue.step5', 'Or tap each letter, double-tap to confirm')}
              </div>
            )}
            {step === 6 && (
              <div className="text-sm font-semibold">
                {t('blast.tutorial.ftue.step6', 'Level 1! Watch your chest bar →')}
              </div>
            )}
            <button
              type="button"
              onClick={onComplete}
              data-testid="ftue-skip"
              className="mt-1 text-[11px] text-white/60 underline underline-offset-2 hover:text-white"
            >
              {t('blast.tutorial.ftue.skip', 'Skip tutorial')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

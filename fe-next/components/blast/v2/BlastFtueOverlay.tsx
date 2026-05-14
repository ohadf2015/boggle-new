'use client';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export type FtueStep = 1 | 2 | 3 | 4 | 5 | 6 | null;

type Props = {
  onComplete: () => void;
  isVeteran?: boolean;
  step?: FtueStep;
};

const MESSAGES: Record<Exclude<FtueStep, null>, { key: string; fallback: string }> = {
  1: { key: 'blast.tutorial.ftue.step1', fallback: 'Drag across letters to spell a word' },
  2: { key: 'blast.tutorial.ftue.step2', fallback: 'Nice — keep going!' },
  3: { key: 'blast.tutorial.ftue.step3', fallback: 'Letters above fall to fill the space' },
  4: { key: 'blast.tutorial.ftue.step4', fallback: 'Find more words to fill the chest bar' },
  5: { key: 'blast.tutorial.ftue.step5', fallback: 'Or tap each letter, double-tap to confirm' },
  6: { key: 'blast.tutorial.ftue.step6', fallback: 'Level 1 complete! Watch your chest bar →' },
};

export function BlastFtueOverlay({ onComplete, isVeteran, step = 1 }: Props) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  if (isVeteran) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center bg-black/75 z-50"
      >
        <m.div
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
        </m.div>
      </m.div>
    );
  }

  if (step === null) return null;
  const msg = MESSAGES[step];

  // Spotlight pattern: full-screen wrapper is pointer-events-none so taps
  // reach the board underneath. Only the message bubble (and step-6 button)
  // claim pointer events.
  return (
    <div
      data-testid="blast-ftue-spotlight"
      className="fixed inset-x-0 top-0 z-40 pointer-events-none flex justify-center"
    >
      <AnimatePresence mode="wait">
        <m.div
          key={`ftue-step-${step}`}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: reducedMotion === true ? 0 : 0.25 }}
          className="pointer-events-auto mt-4 mx-4 max-w-md bg-[#0b1530] border-neo-thick border-black rounded-neo px-5 py-3 text-center text-white shadow-hard"
        >
          <div className="text-sm font-bold" data-step={step}>
            {t(msg.key, msg.fallback)}
          </div>
          {step === 6 && (
            <button
              onClick={onComplete}
              className="mt-3 px-4 py-2 bg-neo-pink border-neo-thick border-black rounded-neo text-sm font-bold"
            >
              {t('blast.tutorial.ftue.step6.cta', 'Continue')}
            </button>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

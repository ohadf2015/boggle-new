/**
 * AdventureTutorial — 3-step FTUE coach marks for first-time adventure players.
 * Shows on first play, remembered via localStorage.
 */

'use client';

import { useState, useCallback } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Hand, Target, Swords } from 'lucide-react';

const STORAGE_KEY = 'lexiclash-adventure-ftue-seen';

const STEP_ICONS = [Hand, Target, Swords] as const;
const STEP_KEYS = [
  { title: 'adventure.tutorial.step1Title', body: 'adventure.tutorial.step1Body' },
  { title: 'adventure.tutorial.step2Title', body: 'adventure.tutorial.step2Body' },
  { title: 'adventure.tutorial.step3Title', body: 'adventure.tutorial.step3Body' },
] as const;

interface AdventureTutorialProps {
  onComplete: () => void;
}

/** Returns true if the tutorial has already been seen. */
export function hasSeenTutorial(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function AdventureTutorial({ onComplete }: AdventureTutorialProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const totalSteps = STEP_KEYS.length;

  const markSeen = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      markSeen();
    }
  }, [step, totalSteps, markSeen]);

  const Icon = STEP_ICONS[step];
  const { title, body } = STEP_KEYS[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-black/80 p-4"
      data-testid="adventure-tutorial"
    >
      <AdaptiveAnimatePresence mode="wait">
        <AdaptiveMotion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard-lg p-6 max-w-sm w-full"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-neo-lime/15 border-2 border-neo-lime/30 flex items-center justify-center">
              <Icon className="w-8 h-8 text-neo-lime" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-neo-white font-neo-display font-bold text-lg text-center mb-2">
            {t(title)}
          </h2>

          {/* Body */}
          <p className="text-neo-white font-neo-body text-sm text-center leading-relaxed mb-5">
            {t(body)}
          </p>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={`step-${i}`}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? 'bg-neo-lime' : i < step ? 'bg-neo-lime/40' : 'bg-neo-white/20'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={markSeen}
              className="flex-1 py-2 rounded-neo border-2 border-neo-white/20 text-neo-white font-neo-display font-bold text-sm hover:border-neo-white/40 transition-colors"
              data-testid="tutorial-skip"
            >
              {t('adventure.tutorial.skip')}
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-2 rounded-neo bg-neo-lime text-neo-black border-2 border-neo-black shadow-hard font-neo-display font-bold text-sm hover:shadow-hard-pressed active:shadow-hard-pressed"
              data-testid="tutorial-next"
            >
              {step < totalSteps - 1 ? t('adventure.tutorial.next') : t('adventure.tutorial.gotIt')}
            </button>
          </div>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    </div>
  );
}

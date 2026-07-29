'use client';

import React, { useEffect } from 'react';
import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import { trackOnboardingFirstWord } from '@/utils/growthTracking';

interface TutorialGameProps {
  onComplete: (score: number, wordsFound: string[]) => void;
  /** Retry index from parent — preserved for funnel parity. */
  attemptNumber?: number;
}

/**
 * Onboarding "transition to practice" step.
 * Replaced the old "find 3 words" mini-game — players jump straight into the
 * full practice hub where the modes themselves teach mechanics. This screen
 * is just a friendly handoff: cheering mascot, one line, one CTA.
 *
 * Signature kept as `onComplete(score, wordsFound)` so OnboardingFlow + tests
 * don't have to change. Score is 0 — ScoreReveal still works (lowest tier).
 */
const TutorialGame: React.FC<TutorialGameProps> = ({ onComplete, attemptNumber = 1 }) => {
  const { t } = useLanguage();

  // Funnel parity: emit a synthetic first-word event at mount so the first-
  // word PostHog metric isn't lost when this step is skipped on continue.
  useEffect(() => {
    trackOnboardingFirstWord('PRACTICE', attemptNumber);
  }, [attemptNumber]);

  const handleContinue = () => {
    onComplete(0, []);
  };

  return (
    <div
      data-testid="tutorial-game"
      className="flex flex-col items-center justify-center min-h-screen bg-neo-navy p-4 relative overflow-hidden"
    >
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="flex flex-col items-center gap-6 max-w-sm"
      >
        <Mascot variant="celebration" size="xl" clipShape="circle" clipBorder="lime" />

        <m.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-neo-cream border-3 border-neo-black rounded-neo p-4 text-center shadow-hard"
        >
          <h1 className="text-2xl font-neo-display font-black text-neo-black uppercase mb-1">
            {t('practiceWelcome.greet')}
          </h1>
          <p className="text-sm font-neo-body font-bold text-neo-black/80">
            {t('practiceWelcome.tip')}
          </p>
        </m.div>

        <m.button
          data-testid="tutorial-continue"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          onClick={handleContinue}
          className="flex items-center gap-2 px-6 py-3 bg-neo-lime border-3 border-neo-black rounded-neo font-neo-display font-black text-neo-black uppercase tracking-wide shadow-hard active:translate-y-px active:shadow-hard-pressed"
        >
          {t('practiceWelcome.cta')}
          <ArrowRight className="w-5 h-5" strokeWidth={3} />
        </m.button>
      </m.div>
    </div>
  );
};

export default TutorialGame;

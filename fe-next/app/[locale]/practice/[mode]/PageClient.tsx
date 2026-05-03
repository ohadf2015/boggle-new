'use client';

import { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import ModeIntroCard from '@/components/game/ModeIntroCard';
import PracticeTutorialSheet from '@/components/practice/PracticeTutorialSheet';
import PracticeClassicSandbox from '@/components/practice/PracticeClassicSandbox';
import PracticeWordHuntSandbox from '@/components/practice/PracticeWordHuntSandbox';
import PracticeWheelSandbox from '@/components/practice/PracticeWheelSandbox';
import { useModeFirstSeen } from '@/hooks/useModeFirstSeen';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  locale: string;
}

type Step = 'intro' | 'tutorial' | 'play';

/**
 * Cozy practice flow:
 *   intro card → tutorial tips → bespoke practice sandbox.
 *
 * Fluency rules:
 *   - First visit: full intro → tutorial → sandbox walk.
 *   - Already-completed mode (re-entry from hub or mode-nav): skip intro AND
 *     tutorial, drop the player straight into the sandbox. Re-reading the
 *     intro for a mode you've already finished feels infantilizing.
 *   - Explicit ?play=1 query param: skip intro+tutorial regardless of state.
 *     Mode-nav uses this to jump directly to a sandbox.
 */
export default function PracticePageClient({ mode, locale: _locale }: Props) {
  const { t, language } = useLanguage();
  const { markSeen } = useModeFirstSeen(mode);
  const searchParams = useSearchParams();

  const initialStep: Step =
    searchParams.get('play') === '1' || isPracticeModeComplete(mode, language)
      ? 'play'
      : 'intro';
  const [step, setStep] = useState<Step>(initialStep);

  // If the player completes the mode in another tab while this one is open,
  // promote the surface to 'play' on next render so they don't get re-routed
  // through the intro on a later visit.
  useEffect(() => {
    if (initialStep === 'play' && step === 'intro') setStep('play');
  }, [initialStep, step]);

  const goToTutorial = useCallback(() => setStep('tutorial'), []);

  const goToPlay = useCallback(() => {
    markSeen();
    setStep('play');
  }, [markSeen]);

  if (step === 'intro') {
    return <ModeIntroCard mode={mode} t={t} onContinue={goToTutorial} onSkip={goToPlay} />;
  }
  if (step === 'tutorial') {
    return <PracticeTutorialSheet mode={mode} t={t} onContinue={goToPlay} />;
  }
  if (mode === 'wordHunt') return <PracticeWordHuntSandbox />;
  if (mode === 'wheelRush') return <PracticeWheelSandbox />;
  return <PracticeClassicSandbox />;
}

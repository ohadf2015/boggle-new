'use client';

import { useCallback, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ModeIntroCard from '@/components/game/ModeIntroCard';
import PracticeTutorialSheet from '@/components/practice/PracticeTutorialSheet';
import PracticeClassicSandbox from '@/components/practice/PracticeClassicSandbox';
import PracticeWordHuntSandbox from '@/components/practice/PracticeWordHuntSandbox';
import PracticeWheelSandbox from '@/components/practice/PracticeWheelSandbox';
import { useModeFirstSeen } from '@/hooks/useModeFirstSeen';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  locale: string;
}

type Step = 'intro' | 'tutorial' | 'play';

/**
 * Cozy practice flow:
 *   intro card → tutorial tips → bespoke practice sandbox.
 * All three modes now have purpose-built practice surfaces — no real-engine
 * fallback. Each sandbox is intentionally small and pressure-free.
 */
export default function PracticePageClient({ mode, locale: _locale }: Props) {
  const { t } = useLanguage();
  const { markSeen } = useModeFirstSeen(mode);
  const [step, setStep] = useState<Step>('intro');

  const goToTutorial = useCallback(() => setStep('tutorial'), []);

  const goToPlay = useCallback(() => {
    markSeen();
    setStep('play');
  }, [markSeen]);

  if (step === 'intro') {
    return <ModeIntroCard mode={mode} t={t} onContinue={goToTutorial} />;
  }
  if (step === 'tutorial') {
    return <PracticeTutorialSheet mode={mode} t={t} onContinue={goToPlay} />;
  }
  if (mode === 'wordHunt') return <PracticeWordHuntSandbox />;
  if (mode === 'wheelRush') return <PracticeWheelSandbox />;
  return <PracticeClassicSandbox />;
}

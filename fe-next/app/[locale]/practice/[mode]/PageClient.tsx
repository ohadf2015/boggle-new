'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ModeIntroCard from '@/components/game/ModeIntroCard';
import PracticeTutorialSheet from '@/components/practice/PracticeTutorialSheet';
import PracticeClassicSandbox from '@/components/practice/PracticeClassicSandbox';
import { useModeFirstSeen } from '@/hooks/useModeFirstSeen';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  locale: string;
}

type Step = 'intro' | 'tutorial' | 'play';

/**
 * Cozy practice flow:
 *   intro card → tutorial tips → bespoke practice surface (sandbox)
 *                              ↳ falls back to gated real engine for modes
 *                                that haven't shipped a sandbox yet.
 *
 * Sandbox status: classic ✅, wordHunt ⏳, wheelRush ⏳.
 */
export default function PracticePageClient({ mode, locale }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const { markSeen } = useModeFirstSeen(mode);
  const [step, setStep] = useState<Step>('intro');

  const goToTutorial = useCallback(() => setStep('tutorial'), []);

  const goToPlay = useCallback(() => {
    markSeen();
    if (mode === 'classic') {
      setStep('play');
      return;
    }
    // Modes without a bespoke sandbox yet: fall back to the gated real engine.
    router.push(practiceTargetUrl(mode, locale));
  }, [markSeen, router, mode, locale]);

  if (step === 'intro') {
    return <ModeIntroCard mode={mode} t={t} onContinue={goToTutorial} />;
  }
  if (step === 'tutorial') {
    return <PracticeTutorialSheet mode={mode} t={t} onContinue={goToPlay} />;
  }
  return <PracticeClassicSandbox />;
}

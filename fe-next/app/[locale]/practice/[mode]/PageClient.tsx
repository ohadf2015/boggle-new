'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ModeIntroCard from '@/components/game/ModeIntroCard';
import PracticeTutorialSheet from '@/components/practice/PracticeTutorialSheet';
import { useModeFirstSeen } from '@/hooks/useModeFirstSeen';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  locale: string;
}

type Step = 'intro' | 'tutorial';

/**
 * Cozy practice flow:
 *   intro card → tutorial tips → real engine.
 * Each step has its own breathing surface; nothing redirects on first sight.
 */
export default function PracticePageClient({ mode, locale }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const { markSeen } = useModeFirstSeen(mode);
  const [step, setStep] = useState<Step>('intro');

  const goToTutorial = useCallback(() => setStep('tutorial'), []);

  const goToEngine = useCallback(() => {
    markSeen();
    router.push(practiceTargetUrl(mode, locale));
  }, [markSeen, router, mode, locale]);

  if (step === 'intro') {
    return <ModeIntroCard mode={mode} t={t} onContinue={goToTutorial} />;
  }
  return <PracticeTutorialSheet mode={mode} t={t} onContinue={goToEngine} />;
}

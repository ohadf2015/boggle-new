'use client';

import { useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
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

type Step = 'tutorial' | 'play';

// SSR-safe alias: useLayoutEffect on the client (paints synchronously, no
// tutorial flash before swap), no-op useEffect on the server.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Cozy practice flow:
 *   merged-tutorial-sheet → bespoke practice sandbox.
 *
 * The former separate `intro` step was merged into the tutorial sheet on
 * 2026-05-03 (audit §3) so the player only ever sees one full-screen pre-game
 * surface per new mode.
 *
 * Fluency rules:
 *   - First visit: tutorial sheet → sandbox.
 *   - Already-completed mode: skip tutorial, drop straight into sandbox.
 *     Re-reading the intro for a mode you've already finished feels infantilizing.
 *   - Explicit ?play=1 query param: skip tutorial regardless of state.
 *     Mode-nav uses this to jump directly to a sandbox.
 */
export default function PracticePageClient({ mode, locale }: Props) {
  const { t, language, dir } = useLanguage();
  const { markSeen } = useModeFirstSeen(mode);
  const searchParams = useSearchParams();

  const initialStep: Step =
    searchParams.get('play') === '1' || isPracticeModeComplete(mode, language)
      ? 'play'
      : 'tutorial';
  const [step, setStep] = useState<Step>(initialStep);

  // If the player completes the mode in another tab while this one is open,
  // promote the surface to 'play' on next render so they don't get re-routed
  // through the tutorial on a later visit.
  useEffect(() => {
    if (initialStep === 'play' && step === 'tutorial') setStep('play');
  }, [initialStep, step]);

  const goToPlay = useCallback(() => {
    markSeen();
    setStep('play');
  }, [markSeen]);

  // Desktop players (≥768px) skip the tutorial entirely — the bigger viewport
  // and pointer affordances make the sandbox self-evident, and the full-screen
  // sheet otherwise feels like a roadblock between the hub click and play.
  // useLayoutEffect runs before paint so desktop never sees a tutorial flash.
  useIsoLayoutEffect(() => {
    if (step !== 'tutorial') return;
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 768px)').matches) return;
    markSeen();
    setStep('play');
  }, [step, markSeen]);

  if (step === 'tutorial') {
    return (
      <PracticeTutorialSheet
        mode={mode}
        t={t}
        locale={locale}
        isRTL={dir === 'rtl'}
        onContinue={goToPlay}
        onSkip={goToPlay}
      />
    );
  }
  if (mode === 'wordHunt') return <PracticeWordHuntSandbox />;
  if (mode === 'wheelRush') return <PracticeWheelSandbox />;
  return <PracticeClassicSandbox />;
}

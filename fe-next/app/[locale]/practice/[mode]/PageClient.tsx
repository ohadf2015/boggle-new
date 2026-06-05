'use client';

import { useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeTutorialSheet from '@/components/practice/PracticeTutorialSheet';
import PracticeClassicSandbox from '@/components/practice/PracticeClassicSandbox';
import PracticeWordHuntSandbox from '@/components/practice/PracticeWordHuntSandbox';
import PracticeWheelSandbox from '@/components/practice/PracticeWheelSandbox';
import PracticeDesktopWelcome from '@/components/practice/PracticeDesktopWelcome';
import { useModeFirstSeen } from '@/hooks/useModeFirstSeen';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';
import { useFTUEGate } from '@/lib/onboarding/useFTUEGate';
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
  useFTUEGate(locale, `/${locale}/practice/${mode}`);

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

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useIsoLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDesktop(window.matchMedia('(min-width: 768px)').matches);
  }, []);

  const goToPlay = useCallback(() => {
    markSeen();
    setStep('play');
  }, [markSeen]);

  const sandbox =
    mode === 'wordHunt' ? <PracticeWordHuntSandbox /> :
    mode === 'wheelRush' ? <PracticeWheelSandbox /> :
    <PracticeClassicSandbox />;

  // Defer render until desktop detection resolves to avoid a one-frame flash
  // of the wrong tutorial surface.
  if (step === 'tutorial' && isDesktop === null) return null;

  if (step === 'tutorial') {
    if (isDesktop) {
      // Desktop: compact tip card inline ABOVE the sandbox so new players get
      // context without a full-screen gate. The sandbox root is hardcoded to
      // ~100dvh, so cap the whole thing to one viewport (via flex-1 + min-h-0 respecting
      // the padded locked body) and let the sandbox fill the remaining height
      // ([&>div]:!h-full overrides its own height) — otherwise card + 100dvh sandbox
      // overflows and the board lands far below the fold (founder: "too much scroll in the game screen").
      return (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="shrink-0">
            <PracticeDesktopWelcome mode={mode} onDismiss={goToPlay} />
          </div>
          <div className="flex-1 min-h-0 [&>div]:!h-full">
            {sandbox}
          </div>
        </div>
      );
    }
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
  return sandbox;
}

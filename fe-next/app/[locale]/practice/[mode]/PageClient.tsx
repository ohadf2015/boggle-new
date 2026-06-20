'use client';

import { useCallback, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeTutorialSheet from '@/components/practice/PracticeTutorialSheet';
import PracticeClassicSandbox from '@/components/practice/PracticeClassicSandbox';
import PracticeWordHuntSandbox from '@/components/practice/PracticeWordHuntSandbox';
import PracticeWheelSandbox from '@/components/practice/PracticeWheelSandbox';
import { useModeFirstSeen } from '@/hooks/useModeFirstSeen';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';
import { useFTUEGate } from '@/lib/onboarding/useFTUEGate';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { trackPracticeAbandoned } from '@/lib/practice/telemetry';
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
 *   - First visit (mobile): tutorial sheet → sandbox.
 *   - Desktop: NO pre-game gate — drop straight into the sandbox. The old inline
 *     "How it works" card cluttered the screen and misaligned with the board
 *     (founder: "practice mode looks bad, get rid of the how it works container").
 *     The in-game "?" help pill + coach tips teach the mode without a gate.
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

  // Own the in-game lever for the WHOLE mode lifecycle — tutorial AND play. The
  // sandboxes flip it too, but the mobile tutorial sheet mounts no sandbox, so
  // without this the footer + bottom-nav leaked (and the page scrolled) during
  // the tutorial. Released on unmount.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const initialStep: Step =
    searchParams.get('play') === '1' || isPracticeModeComplete(mode, language)
      ? 'play'
      : 'tutorial';
  const [step, setStep] = useState<Step>(initialStep);

  // Track current step in a ref so the unmount cleanup captures the latest value
  // without adding `step` to the abandon-event dep array (which would re-register
  // the cleanup on every tutorial→play transition and misfire).
  const stepRef = useRef<Step>(initialStep);
  const mountTimeRef = useRef<number>(Date.now());
  useEffect(() => { stepRef.current = step; }, [step]);

  // Fire `practice_abandoned` when user navigates away before completing.
  // Runs only on unmount (mode/locale are stable for the lifetime of this page).
  useEffect(() => {
    mountTimeRef.current = Date.now();
    return () => {
      if (!isPracticeModeComplete(mode, language)) {
        trackPracticeAbandoned({
          mode,
          locale,
          step: stepRef.current,
          secondsOnPage: Math.round((Date.now() - mountTimeRef.current) / 1000),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, locale]); // mode/locale never change; language read at cleanup time via closure

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

  // Desktop has no pre-game gate: the larger viewport + pointer affordances make
  // the sandbox self-evident, and the in-game "?" help pill + coach tips teach
  // the mode inline. Flip straight to play once desktop is detected so the
  // player lands on the board (and telemetry records the real step).
  useEffect(() => {
    if (isDesktop && step === 'tutorial') goToPlay();
  }, [isDesktop, step, goToPlay]);

  const sandbox =
    mode === 'wordHunt' ? <PracticeWordHuntSandbox /> :
    mode === 'wheelRush' ? <PracticeWheelSandbox /> :
    <PracticeClassicSandbox />;

  // Defer render until desktop detection resolves to avoid a one-frame flash
  // of the wrong tutorial surface.
  if (step === 'tutorial' && isDesktop === null) return null;

  // Mobile first-timers still get the merged walkthrough sheet. Desktop is
  // handled by the flip-to-play effect above, so this branch only renders on
  // mobile (isDesktop === false).
  if (step === 'tutorial' && !isDesktop) {
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
  // Play step (mobile + desktop). The sandbox root sizes itself to its parent
  // (the [&>div]:!h-full override forces its own height to fill, and it expects a
  // definite-height parent). Rendered bare, a flex-item sandbox collapsed to
  // content height on mobile → the board shrank to a tiny box and the page footer
  // pulled up under a blank header (founder bug report). Wrap it in this
  // definite-height flex shell so the board fills the viewport on every surface.
  return (
    <div className="flex-1 min-h-0 flex flex-col [&>div]:!h-full">
      {sandbox}
    </div>
  );
}

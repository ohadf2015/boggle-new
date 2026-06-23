'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import PracticeCompletePopup from './PracticeCompletePopup';
import PracticePostCompleteChip from './PracticePostCompleteChip';
import PracticeBailoutCta from './PracticeBailoutCta';
import PracticeInstructions from './PracticeInstructions';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
  trackPracticeRetryClicked,
} from '@/lib/practice/telemetry';
import { usePracticeWheelRetryCta } from '@/hooks/usePracticeWheelRetryCta';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
// REUSE the real Wheel Rush gameplay. WordWheelGame renders the wheel, builder,
// drag-to-spell, action bar, found-words list, juice and sounds — practice gets
// it all for free. `practice` swaps the countdown for an "end run" CTA and
// `hideCompetitive` strips the leaderboard / rivals / combo / funnel layer.
import WordWheelGame, { type WordWheelGameResult } from '@/components/daily/WordWheelGame';
import { generateWordWheelPuzzle, type WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import type { Language } from '@/types';

// A fresh RANDOM wheel from the REAL generator (the same one the live daily
// wheel uses) — different center+outer letters every visit. We blank the
// date/number so practice never surfaces a daily label.
function makePracticeWheel(language: string): WordWheelPuzzle {
  const seed = Math.random().toString(36).slice(2);
  const generated = generateWordWheelPuzzle(seed, language as Language);
  return { ...generated, puzzleDate: '', puzzleNumber: 0 };
}

/**
 * Wheel-rush practice sandbox. Renders the live {@link WordWheelGame} in
 * practice + hideCompetitive mode so the gameplay is pixel-identical to the
 * real wheel, then wraps it in the calm practice shell: back-to-hub, a goal
 * pill (find N words), the quiet bailout link, and the celebration popup +
 * chain CTA that fire once the goal is reached.
 */
export default function PracticeWheelSandbox() {
  const { language, t } = useLanguage();
  const router = useRouter();

  // Full-screen game surface — hide site footer + bottom nav (no page scroll).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // useState (not useMemo) keeps the wheel stable across re-renders; re-rolls
  // only when the language actually changes (see effect below).
  const [puzzle, setPuzzle] = useState<WordWheelPuzzle>(() => makePracticeWheel(language));

  const validator = usePracticeValidator(language);
  const onValidateWord = useCallback(async (word: string) => {
    const result = await validator.check(word);
    return result.isValid;
  }, [validator]);

  const [foundCount, setFoundCount] = useState(0);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const goal = PRACTICE_GOALS.wheelRush;
  const isComplete = foundCount >= goal;
  const showRetryCta = usePracticeWheelRetryCta(gameOver || (isComplete && popupDismissed));

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wheelRush', locale: language });
  }, [language]);

  // Reroll the wheel + reset the run when the language actually changes.
  // Guarded by a ref so mount keeps the initial wheel (no flicker / double-gen).
  const langRef = useRef(language);
  useEffect(() => {
    if (langRef.current === language) return;
    langRef.current = language;
    setPuzzle(makePracticeWheel(language));
    setFoundCount(0);
    setPopupDismissed(false);
    completedFiredRef.current = false;
  }, [language]);

  useEffect(() => {
    if (isComplete && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('wheelRush', language);
      trackPracticeCompleted({
        mode: 'wheelRush',
        locale: language,
        wordsFound: foundCount,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
    }
  }, [isComplete, foundCount, language]);

  // Each accepted word (surfaced by WordWheelGame) advances the goal pill.
  const handleWordFound = useCallback((word: string, words: string[]) => {
    setFoundCount(words.length);
    trackPracticeWordFound({ mode: 'wheelRush', locale: language, word, wordsFound: words.length });
  }, [language]);

  const liveHref = practiceTargetUrl('wheelRush', language);

  // When the game ends (timer/end-run): mark gameOver so the routing effect
  // or retry-cta overlay can respond. Kept dependency-free to avoid stale closures.
  const handleComplete = useCallback((_result: WordWheelGameResult) => {
    setGameOver(true);
  }, []);

  // control variant: navigate to live game on game-over (retry-cta intercepts via overlay).
  useEffect(() => {
    if (gameOver && !showRetryCta) router.push(liveHref);
  }, [gameOver, showRetryCta, router, liveHref]);

  const handleRetry = useCallback(() => {
    setPuzzle(makePracticeWheel(language));
    setFoundCount(0);
    setPopupDismissed(false);
    setGameOver(false);
    completedFiredRef.current = false;
    startedAtRef.current = Date.now();
    trackPracticeRetryClicked({ mode: 'wheelRush', locale: language });
    trackPracticeStarted({ mode: 'wheelRush', locale: language });
  }, [language]);

  // Practice drops the daily effects canvas — sounds still play via context.
  const noopEffect = useCallback(() => {}, []);

  return (
    <div className="relative flex flex-col items-stretch w-full max-w-md mx-auto px-4 pt-3 pb-2 gap-2 h-full min-h-0 overflow-x-clip overflow-y-auto">
      {/* HUD strip — back-to-hub + the one number that matters (goal progress).
          WordWheelGame carries its own score chip below, so the shell only adds
          the practice goal. */}
      <div className="w-full flex items-center justify-between gap-2">
        <Link
          href={`/${language}/practice`}
          data-testid="practice-back-to-hub"
          aria-label={t('practiceHub.backToHub')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full border-2 border-neo-cream/30 text-xs font-neo-display font-black text-neo-white hover:text-neo-white hover:border-neo-cream/60 shrink-0 transition-colors opacity-70 hover:opacity-100"
        >
          <ArrowLeft className="w-3 h-3 rtl:rotate-180" aria-hidden />
          <span>{t('practiceHub.backToHub')}</span>
        </Link>
        <div
          data-testid="practice-goal-indicator"
          className="px-2.5 py-1 rounded-full bg-neo-purple/25 border-2 border-neo-purple text-neo-white text-xs font-neo-display font-black whitespace-nowrap"
        >
          {foundCount}/{goal}
        </div>
      </div>

      {/* Learn by doing — inline tip retires after the first word. */}
      <PracticeInstructions mode="wheelRush" autoOpen={false} />

      {/* Real Wheel Rush gameplay (practice + no competitive layer). */}
      <div className="flex-1 min-h-0 w-full flex flex-col">
        <WordWheelGame
          puzzle={puzzle}
          duration={120}
          practice
          hideCompetitive
          onWordFound={handleWordFound}
          onValidateWord={onValidateWord}
          onComplete={handleComplete}
          onEffect={noopEffect}
          language={language}
        />
      </div>

      {/* Quiet escape to the real game — never the loudest element. The
          celebration popup carries the loud forward CTA. */}
      <div className="mt-auto w-full">
        <PracticeBailoutCta mode="wheelRush" done={isComplete} href={liveHref} />
      </div>

      <PracticeCompletePopup
        open={isComplete && !popupDismissed}
        mode="wheelRush"
        onDismiss={() => setPopupDismissed(true)}
      />
      {!showRetryCta && <PracticePostCompleteChip open={isComplete && popupDismissed} mode="wheelRush" />}

      {/* exp-practice-wheel-cta-v1: retry-cta variant — "Try Again" overlay on game-over */}
      {showRetryCta && (gameOver || (isComplete && popupDismissed)) && (
        <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2 bg-neo-navy/95 border-t-2 border-neo-purple z-20">
          <button
            data-testid="practice-retry-cta"
            onClick={handleRetry}
            className="w-full py-3 rounded-neo border-2 border-neo-purple bg-neo-purple text-neo-white font-neo-display font-black text-base shadow-hard"
          >
            {t('practiceHub.tryAgain')}
          </button>
          <a
            href={liveHref}
            className="block w-full py-2 text-center text-xs text-neo-cream/60 font-neo-display hover:text-neo-cream transition-colors"
          >
            {t('practiceHub.goLive')}
          </a>
        </div>
      )}
    </div>
  );
}

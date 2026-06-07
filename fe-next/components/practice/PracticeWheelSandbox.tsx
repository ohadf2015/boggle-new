'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
// REUSE the real Wheel Rush gameplay. WordWheelGame renders the wheel, builder,
// drag-to-spell, action bar, found-words list, juice and sounds — practice gets
// it all for free. `practice` swaps the countdown for an "end run" CTA and
// `hideCompetitive` strips the leaderboard / rivals / combo / funnel layer.
import WordWheelGame, { type WordWheelGameResult } from '@/components/daily/WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import type { Language } from '@/types';

interface WheelPuzzle {
  /** Letter at the center — must appear in every accepted word. */
  center: string;
  /** Outer ring letters arranged clockwise from top (60° spacing). */
  outer: string[];
}

// 1 center + 6 outer = 7 letters total, matching real WheelRush
// (utils/dailyChallenge/wordWheelGeneration.ts). Hebrew is finals-free.
const PUZZLES: Record<string, WheelPuzzle> = {
  en: { center: 'A', outer: ['T', 'R', 'C', 'E', 'S', 'N'] },
  he: { center: 'א', outer: ['ב', 'ה', 'ל', 'מ', 'ר', 'ת'] },
  sv: { center: 'A', outer: ['T', 'R', 'K', 'E', 'S', 'N'] },
  ja: { center: 'い', outer: ['ぬ', 'と', 'け', 'ま', 'ね', 'こ'] },
  es: { center: 'A', outer: ['C', 'S', 'M', 'E', 'L', 'R'] },
};

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

  const p = PUZZLES[language] ?? PUZZLES.en;
  const puzzle = useMemo<WordWheelPuzzle>(() => ({
    centerLetter: p.center,
    outerLetters: p.outer,
    allLetters: [p.center, ...p.outer],
    puzzleDate: '',
    puzzleNumber: 0,
    language: language as Language,
  }), [p, language]);

  const validator = usePracticeValidator(language);
  const onValidateWord = useCallback(async (word: string) => {
    const result = await validator.check(word);
    return result.isValid;
  }, [validator]);

  const [foundCount, setFoundCount] = useState(0);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const goal = PRACTICE_GOALS.wheelRush;
  const isComplete = foundCount >= goal;

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wheelRush', locale: language });
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

  // "End run" (WordWheelGame practice CTA) → hand the player straight to the
  // real game, same destination as the quiet bailout link.
  const handleComplete = useCallback((_result: WordWheelGameResult) => {
    router.push(liveHref);
  }, [router, liveHref]);

  // Practice drops the daily effects canvas — sounds still play via context.
  const noopEffect = useCallback(() => {}, []);

  return (
    <div className="relative flex flex-col items-stretch w-full max-w-md mx-auto px-4 pt-3 pb-2 gap-2 h-full min-h-0 overflow-hidden">
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
      <PracticePostCompleteChip open={isComplete && popupDismissed} mode="wheelRush" />
    </div>
  );
}

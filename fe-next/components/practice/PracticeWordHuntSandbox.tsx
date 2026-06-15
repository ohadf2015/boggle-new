'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Lightbulb, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import PracticeCompletePopup from './PracticeCompletePopup';
import PracticePostCompleteChip from './PracticePostCompleteChip';
import PracticeBailoutCta from './PracticeBailoutCta';
import PracticeInstructions from './PracticeInstructions';
import PracticeCoachTip from './PracticeCoachTip';
import PracticeMistakeCoach, { usePracticeMistakeCoach } from './PracticeMistakeCoach';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial } from '@/lib/practice/microTutorial';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import { generateWordHuntPuzzle } from '@/lib/practice/wordHuntPuzzle';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';
import GridComponent from '@/components/GridComponent';
import type { SelectedCell } from '@/components/grid';
import { DiscoveredWordsList } from '@/components/daily/DiscoveredWordsList';
// REUSE the real Word Hunt clue UI + clue accumulation hook so practice
// shows the exact same progressive letter reveals the live game does.
import { SurvivalClueBoxes, useSurvivalClues, FEEDBACK_OVERLAY_DURATION } from '@/components/daily/survival';
import type { TargetAttempt } from '@/components/daily/survival/types';
import {
  getLetterFeedback,
  isTargetWordFound,
  type LetterFeedback,
} from '@/utils/wordHuntFeedback';
import type { HintLevel } from '@/utils/aiHintGenerator';
import { MIN_DISCOVERY_WORD_LENGTH } from '@/shared/constants/gameConstants';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import InlineConfetti from '@/components/effects/InlineConfetti';

const SHORT_TIP_DURATION_MS = 3200;

/**
 * Word-hunt practice sandbox — visual + behavioral parity with the live
 * Word Hunt mode by REUSING the real `<SurvivalClueBoxes>` plus
 * `useSurvivalClues` hook. Submitted target-length guesses populate the
 * clue boxes via `getLetterFeedback`, and bonus discoveries reveal green
 * letters via `updateCluesFromDiscovery` — identical to the live game.
 *
 * Practice differences (intentional):
 *  - Infinite tries (no life drain, no game-over).
 *  - Sub-MIN_DISCOVERY guesses surface an educational "would cost a life"
 *    tip instead of being silently dropped.
 *  - Celebration: real `playWordAcceptedSound` + `<InlineConfetti>` burst.
 */
export default function PracticeWordHuntSandbox() {
  const { language, t } = useLanguage();
  // RANDOM board with the target word embedded (guaranteed findable) from the
  // real generators — same approach as classic practice. JA falls back to a
  // fixed board (its generator can't embed). useState (not useMemo) keeps the
  // target stable across re-renders; re-rolls only on a real language change.
  const [puzzle, setPuzzle] = useState(() => generateWordHuntPuzzle(language));
  const board = puzzle.board;
  const target = puzzle.target;
  const validator = usePracticeValidator(language);
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const juice = usePracticeJuice({ fxRef, burstColor: 0xbfff00 });
  const sound = useSoundEffects();
  const tutorialRef = useRef(createMicroTutorial({ mode: 'wordHunt' }));
  const advanceBeat = useCallback(() => { tutorialRef.current.currentBeat(); }, []);

  const clueContainerRef = useRef<HTMLDivElement | null>(null);
  const [clueState, clueActions] = useSurvivalClues({
    targetWord: target,
    clueContainerRef,
  });

  const [solved, setSolved] = useState(false);
  const [attempts, setAttempts] = useState<TargetAttempt[]>([]);
  const [latestFeedback, setLatestFeedback] = useState<LetterFeedback[] | null>(null);
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);
  const [discoveries, setDiscoveries] = useState<
    Array<{ word: string; timestamp: number; lifeGained: number; tokensGained: number }>
  >([]);
  const [shortTip, setShortTip] = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentSelectionLength, setCurrentSelectionLength] = useState(0);
  const [showDiscoveryTip, setShowDiscoveryTip] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('practice-wh-discovery-seen');
  });

  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shortTipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  // Friendly mid-game coaching — fires once per session per mistake kind.
  const coach = usePracticeMistakeCoach();
  const badCountRef = useRef(0);

  // Build a level-1 hint shape so SurvivalClueBoxes renders the all-? row.
  // Letters reveal via accumulatedClues as the player guesses/discovers.
  const currentHint = useMemo<HintLevel>(
    () => ({
      level: 1,
      hint: target.split('').map(() => '_').join(' '),
      unlockCost: 0,
    }),
    [target],
  );

  const dir: 'ltr' | 'rtl' = language === 'he' ? 'rtl' : 'ltr';

  // Full-screen game surface — hide site footer + bottom nav (no page scroll).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wordHunt', locale: language });
  }, [language]);

  // Reroll the board + reset the run when the language actually changes.
  // Guarded by a ref so mount keeps the initial board (no flicker / double-gen).
  const langRef = useRef(language);
  useEffect(() => {
    if (langRef.current === language) return;
    langRef.current = language;
    setPuzzle(generateWordHuntPuzzle(language));
    setSolved(false);
    setAttempts([]);
    setLatestFeedback(null);
    setShowFeedbackOverlay(false);
    setDiscoveries([]);
    setPopupDismissed(false);
    completedFiredRef.current = false;
  }, [language]);

  useEffect(() => () => {
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    if (shortTipTimeoutRef.current) clearTimeout(shortTipTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (solved && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('wordHunt', language);
      trackPracticeCompleted({
        mode: 'wordHunt',
        locale: language,
        wordsFound: 1,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
      tutorialRef.current.dispatch({ type: 'goal-reached', count: 1 });
      advanceBeat();
    }
  }, [solved, language, advanceBeat]);

  const flashShortTip = useCallback((message: string) => {
    setShortTip(message);
    if (shortTipTimeoutRef.current) clearTimeout(shortTipTimeoutRef.current);
    shortTipTimeoutRef.current = setTimeout(() => setShortTip(null), SHORT_TIP_DURATION_MS);
  }, []);

  const triggerOverlay = useCallback((feedback: LetterFeedback[]) => {
    setLatestFeedback(feedback);
    setShowFeedbackOverlay(true);
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    overlayTimeoutRef.current = setTimeout(() => {
      setShowFeedbackOverlay(false);
    }, FEEDBACK_OVERLAY_DURATION);
  }, []);

  const handleWordSubmit = useCallback(async (rawWord: string) => {
    if (!rawWord || rawWord.length === 0) return;

    setIsVerifying(true);
    const displayWord = rawWord.toUpperCase();
    const targetUpper = target.toUpperCase();

    // Sub-MIN_DISCOVERY: educate, do NOT silently drop.
    if (rawWord.length < MIN_DISCOVERY_WORD_LENGTH) {
      flashShortTip(
        t('practice.wordHunt.shortWordTip', {
          word: displayWord,
          min: MIN_DISCOVERY_WORD_LENGTH,
        }),
      );
      const tile = document.querySelector('[data-row][data-col]');
      if (tile) juice.triggerInvalid(tile);
      setIsVerifying(false);
      return;
    }

    // Target match — full clue reveal + celebration.
    if (displayWord === targetUpper) {
      const winFeedback = targetUpper.split('').map((ch, idx) => ({
        letter: ch,
        feedback: 'green' as const,
        position: idx,
      }));
      const winAttempt: TargetAttempt = {
        word: displayWord,
        feedback: winFeedback,
        timestamp: Date.now(),
      };
      const nextAttempts = [...attempts, winAttempt];
      setAttempts(nextAttempts);
      clueActions.updateCluesFromFeedback(winFeedback, nextAttempts);
      triggerOverlay(winFeedback);
      setSolved(true);
      sound.playWordAcceptedSound?.();
      setConfettiKey((k) => k + 1);
      const cells = Array.from(document.querySelectorAll('[data-row][data-col]')) as HTMLElement[];
      const positions = cells.slice(0, displayWord.length).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, el };
      });
      juice.triggerWordFound(positions);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
      setIsVerifying(false);
      return;
    }

    // Same length as target — counts as a target attempt with feedback.
    if (displayWord.length === targetUpper.length) {
      if (attempts.some((a) => a.word === displayWord)) {
        setIsVerifying(false);
        return; // duplicate
      }
      const feedback = getLetterFeedback(displayWord, targetUpper, language);
      const attempt: TargetAttempt = {
        word: displayWord,
        feedback,
        timestamp: Date.now(),
      };
      const nextAttempts = [...attempts, attempt];
      setAttempts(nextAttempts);
      clueActions.updateCluesFromFeedback(feedback, nextAttempts);
      triggerOverlay(feedback);

      if (isTargetWordFound(feedback)) {
        setSolved(true);
        sound.playWordAcceptedSound?.();
        setConfettiKey((k) => k + 1);
      } else {
        // Wrong target attempt: still validate vs board for "bonus discovery"
        // path — keep parity with real game's same-length-and-on-board flow.
        const result = await validator.check(displayWord);
        if (result.isValid && !discoveries.some((d) => d.word === displayWord)) {
          setDiscoveries((d) => [
            ...d,
            { word: displayWord, timestamp: Date.now(), lifeGained: 0, tokensGained: 0 },
          ]);
          const cluesRevealed = clueActions.updateCluesFromDiscovery(displayWord);
          if (cluesRevealed > 0) clueActions.triggerClueGainAnimation(cluesRevealed);
          sound.playWordAcceptedSound?.();
          trackPracticeWordFound({
            mode: 'wordHunt',
            locale: language,
            word: displayWord,
            wordsFound: discoveries.length + 1,
          });
        }
      }
      setIsVerifying(false);
      return;
    }

    // Discovery word (shorter than target): validate + reveal clues.
    const result = await validator.check(displayWord);
    if (!result.isValid) {
      const tile = document.querySelector('[data-row][data-col]');
      if (tile) juice.triggerInvalid(tile);
      sound.playWordRejectedSound?.();
      // 1st invalid bonus-word attempt → coach the "real words only" rule.
      badCountRef.current += 1;
      if (badCountRef.current === 1) coach.trigger('notAWord');
      setIsVerifying(false);
      return;
    }
    if (discoveries.some((d) => d.word === displayWord)) {
      setIsVerifying(false);
      return;
    }
    setDiscoveries((d) => [
      ...d,
      { word: displayWord, timestamp: Date.now(), lifeGained: 0, tokensGained: 0 },
    ]);
    trackPracticeWordFound({
      mode: 'wordHunt',
      locale: language,
      word: displayWord,
      wordsFound: discoveries.length + 1,
    });
    const cluesRevealed = clueActions.updateCluesFromDiscovery(displayWord);
    if (cluesRevealed > 0) {
      clueActions.triggerClueGainAnimation(cluesRevealed);
      flashShortTip(t('practice.wordHunt.discoveryHint'));
    } else {
      flashShortTip(t('practice.wordHunt.discoveryTipNoClue'));
    }
    sound.playWordAcceptedSound?.();
    setConfettiKey((k) => k + 1);
    setIsVerifying(false);
  }, [
    target,
    attempts,
    language,
    validator,
    juice,
    sound,
    discoveries,
    clueActions,
    triggerOverlay,
    flashShortTip,
    t,
    advanceBeat,
    coach,
  ]);

  const onSelectionChange = useCallback((cells: SelectedCell[]) => {
    setCurrentSelectionLength(cells.length);
    tutorialRef.current.dispatch({ type: 'drag-started' });
    advanceBeat();
  }, [advanceBeat]);

  const liveHref = `/${language}/daily/word-hunt`;

  return (
    <div className="relative flex flex-col items-stretch w-full max-w-md mx-auto px-4 pt-3 pb-2 gap-2 h-full min-h-0 overflow-hidden md:overflow-y-auto">
      <PracticePixiFx ref={fxRef} />

      {/* Discovery mechanic onboarding tip */}
      {showDiscoveryTip && (
        <div className="flex items-start gap-2 bg-neo-navy/60 border-2 border-neo-lime text-neo-white text-sm p-3 mb-2 rounded-neo">
          <Lightbulb aria-hidden className="w-4 h-4 mt-0.5 shrink-0 text-neo-lime" strokeWidth={2.5} />
          <div className="flex-1">
            <span className="font-bold">{t('practice.wordHunt.discoveryTip')}</span>
            <button
              onClick={() => {
                localStorage.setItem('practice-wh-discovery-seen', '1');
                setShowDiscoveryTip(false);
              }}
              className="ml-2 underline text-neo-lime text-xs hover:text-neo-white transition-colors"
            >
              {t('common.understood')}
            </button>
          </div>
        </div>
      )}

      {/* HUD strip — back-to-hub only. The goal + remaining tries live in the
          clue-box row below; a second tries chip here just confused players
          (it showed the *real-game* try count next to practice's own). */}
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
      </div>

      {/* Learn by doing: drop straight onto the board with an inline tip that
          retires once the player lands their first word. */}
      <PracticeInstructions mode="wordHunt" autoOpen={false} />
      <PracticeCoachTip mode="wordHunt" wordsFound={discoveries.length + (solved ? 1 : 0)} />
      <PracticeMistakeCoach kind={coach.active} mode="wordHunt" onClose={coach.close} />

      <div className="flex flex-col items-center gap-2 flex-1 min-h-0 w-full overflow-hidden">
        {/* REAL clue boxes — letters reveal as discoveries / target attempts
            land their feedback. data-testid wrapper allows tests to assert
            presence without depending on internal SurvivalClueBoxes markup. */}
        <div data-testid="practice-target" className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neo-lime/20 border border-neo-lime text-neo-lime font-neo-display font-black text-sm">
            <Search aria-hidden className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            <span>{t('practice.wordHunt.goalChip', { word: target.toUpperCase() })}</span>
          </div>
          <div data-testid="practice-clue-boxes" className="w-full">
            <SurvivalClueBoxes
              ref={clueContainerRef}
              currentHint={currentHint}
              targetWord={target}
              attempts={attempts}
              accumulatedClues={clueState.accumulatedClues}
              revealedLetters={new Set()}
              knownLetters={clueState.knownLetters}
              latestAttemptFeedback={latestFeedback}
              showFeedbackOverlay={showFeedbackOverlay}
              isClueGaining={clueState.isClueGaining}
              skipAnimations={false}
              gameDir={dir}
              t={t as (key: string) => string}
              matchesTargetLength={!solved && currentSelectionLength === target.length}
            />
          </div>
        </div>

        <div className="min-h-[2rem] flex items-center justify-center w-full">
          {shortTip && (
            <div
              data-testid="practice-short-tip"
              role="status"
              aria-live="polite"
              className="px-3 py-1.5 rounded-neo border-2 border-neo-pink bg-neo-pink/15 text-neo-white font-neo-display font-bold text-xs text-center max-w-xs"
            >
              {shortTip}
            </div>
          )}
        </div>

        <div className={`flex-1 min-h-0 flex items-center justify-center w-full relative transition-opacity duration-200 ${isVerifying ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Fill the flex space and let `.game-board-frame`'s
            `max-height: min(board-size, 100%)` clamp the square to the
            available height — mirrors the live game's <SurvivalGridSection>.
            A width-driven `aspect-square` here overflowed downward and painted
            tiles over the discoveries list when vertical room was tight. */}
        <div data-testid="practice-board" className="w-full h-full">
          <GridComponent
            grid={board}
            interactive
            onWordSubmit={handleWordSubmit}
            onSelectionChange={onSelectionChange}
            hideComboIndicator
            language={language}
            autoSubmitIdleMs={1000}
          />
        </div>
        {isVerifying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-2 border-neo-lime border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        </div>

        {discoveries.length > 0 && (
          <div
            className="flex-shrink-0 w-full max-h-[2.5rem] overflow-hidden"
            data-testid="practice-discoveries"
          >
            <DiscoveredWordsList words={discoveries} t={t} />
          </div>
        )}

        {confettiKey > 0 && (
          <div data-testid="practice-confetti" className="absolute left-1/2 top-32 -translate-x-1/2 pointer-events-none">
            <InlineConfetti key={confettiKey} size="md" />
          </div>
        )}
      </div>

      {/* Quiet escape to the real game — always available, never the loudest
          thing on screen. The celebration popup carries the loud forward CTA. */}
      <div className="mt-auto w-full">
        <PracticeBailoutCta mode="wordHunt" done={solved} href={liveHref} />
      </div>

      <PracticeCompletePopup
        open={solved && !popupDismissed}
        mode="wordHunt"
        onDismiss={() => setPopupDismissed(true)}
      />
      <PracticePostCompleteChip open={solved && popupDismissed} mode="wordHunt" />
    </div>
  );
}

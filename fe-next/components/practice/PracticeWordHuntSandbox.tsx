'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeCompletePopup from './PracticeCompletePopup';
import PracticePostCompleteChip from './PracticePostCompleteChip';
import PracticeInstructions from './PracticeInstructions';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeMistakeCoach, { usePracticeMistakeCoach } from './PracticeMistakeCoach';
import PracticeModeNav from './PracticeModeNav';
import PracticeMicroTip from './PracticeMicroTip';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';
import GridComponent from '@/components/GridComponent';
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

const BOARDS: Record<string, string[][]> = {
  en: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  he: [['ש', 'ל', 'ו', 'מ'], ['ב', 'י', 'ת', 'א'], ['ה', 'נ', 'ר', 'ע'], ['ק', 'ד', 'ח', 'ג']],
  sv: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  ja: [['い', 'ぬ', 'か', 'み'], ['ね', 'こ', 'と', 'り'], ['さ', 'く', 'ら', 'ま'], ['は', 'な', 'ゆ', 'き']],
  es: [['C', 'A', 'S', 'A'], ['M', 'E', 'L', 'O'], ['T', 'I', 'A', 'R'], ['E', 'O', 'N', 'P']],
};

const TARGETS: Record<string, string> = {
  en: 'STAR',
  he: 'ארנב',
  sv: 'STAR',
  ja: 'さくら',
  es: 'CASA',
};

// Mirrors live `MAX_ATTEMPTS` shown in the educational tries pill.
const REAL_GAME_MAX_TRIES = 7;

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
  const board = BOARDS[language] ?? BOARDS.en;
  const target = TARGETS[language] ?? TARGETS.en;
  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const sound = useSoundEffects();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'wordHunt' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

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

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wordHunt', locale: language });
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
      return;
    }

    // Same length as target — counts as a target attempt with feedback.
    if (displayWord.length === targetUpper.length) {
      if (attempts.some((a) => a.word === displayWord)) {
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
      return;
    }
    if (discoveries.some((d) => d.word === displayWord)) return;
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

  const onSelectionChange = useCallback(() => {
    tutorialRef.current.dispatch({ type: 'drag-started' });
    advanceBeat();
  }, [advanceBeat]);

  const mascotReaction: PracticeMascotMood = solved
    ? 'celebrate'
    : showFeedbackOverlay
      ? 'cheer'
      : shortTip
        ? 'wrong'
        : 'idle';

  const liveHref = `/${language}/daily/word-hunt`;

  return (
    <div className="relative flex flex-col items-stretch w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3 min-h-[calc(100dvh-var(--bottom-stack-height,5rem))]">
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wordHunt" reaction={mascotReaction} />

      {/* HUD strip — mode nav + educational tries pill. */}
      <div className="w-full flex items-center justify-between gap-2">
        <PracticeModeNav current="wordHunt" />
        <div
          data-testid="practice-tries-chip"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neo-navy/60 border-2 border-neo-cream/15 text-neo-cream text-[10px] sm:text-xs font-neo-display font-black whitespace-nowrap"
          title={t('practice.wordHunt.livesNote', { max: REAL_GAME_MAX_TRIES })}
        >
          <Heart className="w-3 h-3 text-neo-pink fill-neo-pink" aria-hidden />
          <span>∞ · {REAL_GAME_MAX_TRIES} {t('practice.wordHunt.realGameLabel')}</span>
        </div>
      </div>

      <PracticeInstructions mode="wordHunt" />
      <PracticeMistakeCoach kind={coach.active} mode="wordHunt" onClose={coach.close} />

      <div className="flex flex-col items-center gap-3 flex-1 w-full">
        {/* REAL clue boxes — letters reveal as discoveries / target attempts
            land their feedback. data-testid wrapper allows tests to assert
            presence without depending on internal SurvivalClueBoxes markup. */}
        <div data-testid="practice-target" className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-xs uppercase font-neo-display font-black text-neo-cream/70 tracking-wider">
            {t('practice.wordHunt.targetLabel')}
          </span>
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
              matchesTargetLength={false}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-neo-cream/60 text-center max-w-xs px-2 mt-1">
            {t('practice.wordHunt.livesNote', { max: REAL_GAME_MAX_TRIES })}
          </p>
        </div>

        {shortTip && (
          <div
            data-testid="practice-short-tip"
            role="status"
            aria-live="polite"
            className="px-3 py-1.5 rounded-neo border-2 border-neo-pink bg-neo-pink/15 text-neo-cream font-neo-display font-bold text-xs text-center max-w-xs"
          >
            {shortTip}
          </div>
        )}

        <PracticeMicroTip
          beat={beat}
          onDismiss={() => {
            tutorialRef.current.dispatch({ type: 'beat-completed' });
            advanceBeat();
          }}
        />

        <div data-testid="practice-board" className="w-full max-w-xs aspect-square mx-auto">
          <GridComponent
            grid={board}
            interactive
            onWordSubmit={handleWordSubmit}
            onSelectionChange={onSelectionChange}
            hideComboIndicator
            language={language}
          />
        </div>

        {discoveries.length > 0 && (
          <div
            className="w-full max-h-[14vh] overflow-y-auto"
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

      {/* Bail-out CTA — pinned bottom, ALWAYS visible. Players must always
          have a one-tap escape to the real game, even after solving (the
          celebration popup is a chain CTA, not the only forward path). */}
      <div className="mt-auto w-full">
        <Link
          href={liveHref}
          data-testid="practice-bailout-cta"
          className="inline-flex items-center justify-center w-full bg-neo-pink text-neo-cream border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px]"
        >
          {t(solved ? 'practice.wordHunt.playRealCta' : 'practice.wordHunt.bailoutCta')}
        </Link>
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

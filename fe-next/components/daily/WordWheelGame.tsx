'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { scoreWord, wordPoints, usesGold, wheelBreakdown, goldCoinsFor, scaleRankThresholds } from '@/utils/dailyChallenge/wordWheelScoring';
import { classifyLetterCoverage } from '@/lib/wheelRush/letterCoverage';
import { wheelWordDir } from '@/lib/wheelRush/wordDirection';
import type { Language } from '@/types';
import { WheelRushCelebration, type WheelCelebration } from '@/components/multiplayer/WheelRushCelebration';
import { fireConfetti } from '@/utils/confettiUtils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import WheelDisc from './wheel/WheelDisc';
import WheelCoachSlot from './wheel/WheelCoachSlot';
import { useWheelWordFx } from './wheel/useWheelWordFx';
import { useWordWheelKeyboard } from '@/hooks/useWordWheelKeyboard';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import { trackGameEnd, trackGameStart, trackGrowthEvent } from '@/utils/growthTracking';
import { useExperiment } from '@/hooks/useExperiment';
import { useMPFTUEIdle } from '@/hooks/useMPFTUEIdle';
import { MPDragCoachmark } from '@/components/multiplayer/MPDragCoachmark';
import { liveVerdict } from '@/lib/wordWheel/liveVerdict';
import { claimPointer } from '@/lib/wordWheel/claimPointer';
import WordWheelRankLadder from './WordWheelRankLadder';
import WordWheelWordLine from './WordWheelWordLine';
import { useWordWheelSubmit, type LetterClear, type RejectKind } from './useWordWheelSubmit';
import WheelActionBar from './wheel/WheelActionBar';
import WheelPassToasts from './wheel/WheelPassToasts';
import type { WordWheelGameProps, WordWheelGameResult } from './wheel/wordWheelGameProps';
import { useWheelTimer } from './wheel/useWheelTimer';
import { useWheelRivals, usePassToasts } from './wheel/useWheelRivals';
import { useWheelFeedback, useChannelTimers, haptic, afterPaint } from './wheel/useWheelFeedback';
import { useWheelCombo } from './wheel/useWheelCombo';
import { useWheelLetterInput } from './wheel/useWheelLetterInput';
import WordWheelFoundWords from './WordWheelFoundWords';
import WordWheelHud from './WordWheelHud';
import WordWheelLiveRanks from './WordWheelLiveRanks';
import { GameShell, ShellKeysCard, SHELL_MEDIA } from '@/components/game/shell';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { rankThresholds } from '@/lib/wordWheel/rankLadder';

export type { WordWheelGameResult } from './wheel/wordWheelGameProps';

// Tap spelling gets time to finish a longer word before an idle builder submits itself.
const TAP_IDLE_SUBMIT_MS = 2500;

const WordWheelGame: React.FC<WordWheelGameProps> = ({
  puzzle, duration, onComplete, onValidateWord, onQuickVerdict, onEffect, language, paused = false, practice = false,
  hideModeCoach = false,
  hideCompetitive = false, rivals: rivalsOverride, onWordFound,
  puzzleDate, currentPlayerId = null, currentGuestFingerprint = null, onExit,
  bonuses = false, goldLetter: goldProp = null,
}) => {
  const goldLetter = bonuses ? goldProp : null;
  const goldIndex = goldLetter ? puzzle.outerLetters.indexOf(goldLetter) : -1;
  const { t } = useLanguage();
  const inShell = useMediaQuery(SHELL_MEDIA);
  const prefersReducedMotion = useReducedMotion() ?? false;
  // Builder direction follows the wheel's letters, not the UI locale.
  const wordDir = useMemo(() => wheelWordDir(puzzle.allLetters, language as Language), [puzzle.allLetters, language]);
  const {
    playTileSelectSound, playWordAcceptedSound, playWordRejectedSound,
    playComboSound, playLegendaryWordSound, playEpicVictorySound,
    playCountdownBeep, playButtonClickSound,
    playWordLengthSound,
  } = useSoundEffects();

  // Built word: array of { letter, wheelIndex } — wheelIndex: -1 = center
  const [builtLetters, setBuiltLetters] = useState<Array<{ letter: string; wheelIndex: number }>>([]);
  const [wordsFound, setWordsFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const outerLetters = puzzle.outerLetters;
  const { fx, fire: fireFx, release, hold: holdRelease, drop: dropRelease } = useWheelWordFx();
  const timers = useChannelTimers();
  const [lastWordScore, setLastWordScore] = useState<{ points: number; multiplier: number; gold: boolean } | null>(null);
  // Monotonic key for the flying "+score": a time-based key remounted it on every render.
  const [scoreFlyId, setScoreFlyId] = useState(0);
  const comboState = useWheelCombo(bonuses, timers);
  const { combo, register: registerCombo, breakCombo } = comboState;
  const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
  const acceptedLogRef = useRef<Array<{ word: string; multiplier: number }>>([]);
  const [celebration, setCelebration] = useState<WheelCelebration | null>(null);

  // exp-wordwheel-drag-hint-v1: idle "swipe to spell" coachmark, suppressed once a word is found.
  const { variant: dragHintVariant, trackExposure: trackDragHintExposure } =
    useExperiment('exp-wordwheel-drag-hint-v1');
  useEffect(() => {
    trackDragHintExposure();
  }, [trackDragHintExposure]);
  const dragHintFtue = useMPFTUEIdle({
    enabled: dragHintVariant === 'drag-hint',
    wordsFound: wordsFound.length,
    idleMs: 6000,
    storageKey: 'ww_ftue_drag_v1',
    onShown: () => trackGrowthEvent('wordwheel_drag_hint_shown', { variant: dragHintVariant }),
  });

  const gameOverRef = useRef(false);
  const wordsFoundRef = useRef<string[]>([]);
  const scoreRef = useRef(0);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const idleSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A drag-release submit clears a wrong word at once; the finger is already up.
  const lastSubmitWasDragRef = useRef(false);

  const fetchedRivals = useWheelRivals({
    enabled: !hideCompetitive && !rivalsOverride,
    language, puzzleDate, currentPlayerId, currentGuestFingerprint,
  });
  const rivals = rivalsOverride ?? fetchedRivals;
  // The rival layer is on whenever there is a cohort to race: the daily board, or one the caller handed us.
  const showRivalLayer = !hideCompetitive || !!rivalsOverride;

  useEffect(() => { wordsFoundRef.current = wordsFound; }, [wordsFound]);

  // Funnel parity: emit game_started once on mount to pair with trackGameEnd('word-wheel', ...).
  // Practice hub (hideCompetitive) is outside the daily funnel, so it stays silent.
  useEffect(() => {
    if (!hideCompetitive) trackGameStart('word-wheel', { language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passToasts = usePassToasts({
    enabled: showRivalLayer,
    rivals,
    score,
    onPass: () => {
      const cx = gameContainerRef.current ? gameContainerRef.current.getBoundingClientRect().width / 2 : 200;
      haptic([15, 25, 15, 25, 30]);
      playComboSound(2);
      onEffect({ type: 'combo', x: cx, y: 140, combo: 2 });
    },
  });

  const handleSubmitRef = useRef<() => void>(() => {});
  const cancelIdleSubmit = useCallback(() => {
    if (idleSubmitTimerRef.current) { clearTimeout(idleSubmitTimerRef.current); idleSubmitTimerRef.current = null; }
  }, []);
  const {
    builtLettersRef, usedIndices, draggingRef, pointerPosRef, pendingLetter, setPendingLetter,
    holdActiveIndex, holdPointerDown, holdPointerEnd,
    handleLetterPress, handlePointerDown, handlePointerMove, handlePointerUp,
    handleRemoveLetter, handleClear, handleBackspace,
  } = useWheelLetterInput({
    builtLetters, setBuiltLetters, gameOverRef, handleSubmitRef, lastSubmitWasDragRef, gameContainerRef,
    cancelIdleSubmit, onActivity: dragHintFtue.markActivity, onEffect, playTileSelectSound, playButtonClickSound,
  });

  // An idle builder submits itself (a drag submits on release instead). Tap spelling gets time to
  // finish a longer word, and a word the dictionary already rejects is never auto-submitted.
  // Any change also cancels a pending post-error reset so a new tap is not wiped mid-typing.
  const prevBuiltLengthRef = useRef(0);
  useEffect(() => {
    cancelIdleSubmit();
    timers.clear('autoReset');
    // A removal is an edit in progress: auto-submitting it made players race the timer with backspace.
    const grew = builtLetters.length > prevBuiltLengthRef.current;
    prevBuiltLengthRef.current = builtLetters.length;
    const verdict = liveVerdict(builtLetters.map(bl => bl.letter).join(''), puzzle.centerLetter, wordsFoundRef.current, onQuickVerdict);
    if (grew && builtLetters.length >= 3 && !gameOverRef.current && verdict !== 'no' && verdict !== 'found') {
      idleSubmitTimerRef.current = setTimeout(() => {
        idleSubmitTimerRef.current = null;
        // Mid-drag the release submits; firing here split a slow swipe into a half word.
        if (draggingRef.current) return;
        handleSubmitRef.current();
      }, TAP_IDLE_SUBMIT_MS);
    }
    return cancelIdleSubmit;
  }, [builtLetters, cancelIdleSubmit, timers, puzzle.centerLetter, onQuickVerdict, draggingRef, handleSubmitRef]);

  // 'all' rides the Pixi pangram burst; 'almost' gets a light DOM confetti pop (self-gated on low-end).
  const triggerFeatBanner = useCallback((tier: 'all' | 'almost', word: string, points: number) => {
    setCelebration({ tier, word, key: Date.now(), points });
    if (tier === 'almost') {
      fireConfetti({ particleCount: 36, spread: 80, startVelocity: 50, origin: { y: 0.5 } });
    }
    timers.set('celebration', () => setCelebration(null), 1900);
  }, [timers]);

  const builtWord = useMemo(
    () => builtLetters.map(bl => bl.letter).join(''),
    [builtLetters],
  );

  // Set below, once accept exists: a valid word still on the line at the buzzer counts.
  const flushBuilderRef = useRef<() => void>(() => {});
  const finish = useCallback((timeSeconds: number) => {
    gameOverRef.current = true;
    const words = wordsFoundRef.current;
    const result: WordWheelGameResult = { wordsFound: words, score: scoreRef.current, timeSeconds };
    if (bonuses) {
      result.breakdown = wheelBreakdown(acceptedLogRef.current, goldLetter);
      result.coins = goldCoinsFor(words, goldLetter);
    }
    onComplete(result);
  }, [bonuses, goldLetter, onComplete]);

  const { clock } = useWheelTimer({
    duration,
    running: !paused && !practice,
    onWarning: () => onEffect({ type: 'timeWarning' }),
    onTick: (secondsLeft) => {
      playCountdownBeep(secondsLeft);
      onEffect({ type: 'timeTick', secondsLeft });
    },
    onExpire: () => {
      if (gameOverRef.current) return;
      flushBuilderRef.current();
      gameOverRef.current = true;
      onEffect({ type: 'gameComplete', score: scoreRef.current });
      playEpicVictorySound();
      trackGameEnd('word-wheel', scoreRef.current, wordsFoundRef.current.length, true, duration, { isWinner: wordsFoundRef.current.length > 0 });
      finish(duration);
    },
  });

  // Practice-mode end CTA: player taps to wrap up the run with current state.
  // Mirrors the natural timer-end onComplete payload so downstream results UI
  // doesn't need a special practice branch.
  const handleEndPractice = useCallback(() => {
    if (gameOverRef.current) return;
    finish(0);
  }, [finish]);

  const { feedback, shake: wordBuilderShake, pulse, showSuccess, showRejection } = useWheelFeedback({
    builtLettersRef, setBuiltLetters, fireFx, cancelIdleSubmit, timers,
  });

  // ── Accept a word (score, list, effects) ──
  const acceptWord = useCallback((word: string, spelled: { letter: string; wheelIndex: number }[]) => {
    const cx = gameContainerRef.current
      ? gameContainerRef.current.getBoundingClientRect().width / 2
      : 200;
    const step = registerCombo();
    const gold = bonuses && usesGold(word, goldLetter);
    const points = bonuses ? wordPoints(word, { gold: goldLetter, multiplier: step.multiplier }) : scoreWord(word);
    acceptedLogRef.current.push({ word, multiplier: step.multiplier });
    const nextWordsFound = [...wordsFoundRef.current, word];
    wordsFoundRef.current = nextWordsFound;
    scoreRef.current += points;
    setWordsFound(nextWordsFound);
    setScore(scoreRef.current);
    onWordFound?.(word, nextWordsFound, scoreRef.current);
    // 'all' = every distinct wheel letter used (a wheel pangram); 'almost' = all but one.
    const wheelLetters = puzzle.allLetters ?? [puzzle.centerLetter, ...puzzle.outerLetters];
    const coverage = classifyLetterCoverage(word, wheelLetters);
    const isAllLetters = coverage === 'all';
    fireFx({ kind: 'good', indices: spelled.map(bl => bl.wheelIndex), letters: spelled.map(bl => bl.letter), points, coverage });
    setLastWordScore({ points, multiplier: step.multiplier, gold });
    setScoreFlyId(id => id + 1);
    timers.set('score', () => setLastWordScore(null), 1200);
    showSuccess(`+${points}`);
    if (builtLettersRef.current.map(bl => bl.letter).join('').toUpperCase() === word) {
      builtLettersRef.current = [];
      setBuiltLetters([]);
    }
    setLastFoundWord(word);
    timers.set('found', () => setLastFoundWord(null), 2000);
    const newCombo = step.chain;

    afterPaint(() => {
      if (isAllLetters) {
        playLegendaryWordSound();
        haptic([50, 30, 50, 30, 80]);
      } else {
        playWordAcceptedSound();
        if (word.length >= 5) playWordLengthSound(word.length);
        haptic(newCombo >= 2 ? [15, 30, 15, 30, 15] : 20);
      }
      if (newCombo >= 2) playComboSound(newCombo);
      onEffect(isAllLetters ? { type: 'pangram', x: cx, y: 200 } : { type: 'wordValid', x: cx, y: 200, points });
      // A new multiplier tier gets the big combo burst; a plain chain step keeps the light one.
      if (step.tierUp) onEffect({ type: 'combo', x: cx, y: 160, combo: Math.max(5, newCombo) });
      else if (newCombo >= 2) onEffect({ type: 'combo', x: cx, y: 160, combo: newCombo });
    });

    if (coverage !== 'none') triggerFeatBanner(coverage, word, points);
  }, [puzzle, bonuses, goldLetter, registerCombo, builtLettersRef, showSuccess, onEffect, playWordAcceptedSound, playLegendaryWordSound, playComboSound, playWordLengthSound, triggerFeatBanner, onWordFound, fireFx, timers]);

  const rejectWord = useCallback((message: string, clear: LetterClear, spelled: { letter: string; wheelIndex: number }[], kind: RejectKind) => {
    const cx = gameContainerRef.current
      ? gameContainerRef.current.getBoundingClientRect().width / 2
      : 200;
    showRejection(message, kind, clear, spelled);
    if (kind === 'invalid') breakCombo();
    if (kind === 'found' || kind === 'unknown') return;
    afterPaint(() => {
      onEffect({ type: 'error', x: cx, y: 80 });
      playWordRejectedSound();
    });
  }, [showRejection, breakCombo, onEffect, playWordRejectedSound]);

  flushBuilderRef.current = () => {
    const spelled = builtLettersRef.current;
    const word = spelled.map(bl => bl.letter).join('').toUpperCase();
    if (word.length >= 3 && liveVerdict(word, puzzle.centerLetter, wordsFoundRef.current, onQuickVerdict) === 'word') {
      acceptWord(word, spelled);
    }
  };

  const { handleSubmit, pendingWord, isValidating } = useWordWheelSubmit({
    puzzle, t, builtLettersRef, setBuiltLetters, wordsFoundRef, gameOverRef, lastSubmitWasDragRef,
    onValidateWord, onQuickVerdict, accept: acceptWord, reject: rejectWord,
    hold: (r) => flushSync(() => holdRelease(r)), drop: dropRelease,
  });

  // Keep submit ref fresh so double-tap handler (created earlier) can reach the latest closure.
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  // ── Keyboard input ──
  useWordWheelKeyboard({
    centerLetter: puzzle.centerLetter, outerLetters, usedIndices,
    handleSubmit, handleClear, setBuiltLetters,
    gameOver: gameOverRef.current, active: !paused, playTileSelectSound, playButtonClickSound,
  });

  const equippedBoardTheme = useEquippedCosmetic('boardTheme');
  const equippedTileSkin = useEquippedCosmetic('tileSkin');
  const thresholds = useMemo(
    () => (bonuses ? scaleRankThresholds(rankThresholds(duration), puzzle.puzzleDate) : rankThresholds(practice ? 120 : duration)),
    [bonuses, practice, duration, puzzle.puzzleDate],
  );

  const hud = (
    <WordWheelHud
      t={t}
      clock={clock}
      duration={duration}
      combo={combo}
      multiplier={comboState.multiplier}
      comboBreakId={comboState.breakId}
      showCombo={!hideCompetitive}
      practice={practice}
      onEndPractice={handleEndPractice}
      onExit={onExit}
      className={inShell ? undefined : 'pe-12 sm:pe-0'}
    />
  );

  const ladder = (
    <WordWheelRankLadder
      t={t}
      score={score}
      thresholds={thresholds}
      rivals={rivals}
      showRival={showRivalLayer}
      variant={inShell ? 'wide' : 'bar'}
    />
  );

  const foundWords = (
    <WordWheelFoundWords
      t={t}
      words={wordsFound}
      lastFound={lastFoundWord}
      variant={inShell ? 'panel' : 'strip'}
      reducedMotion={prefersReducedMotion}
      pulse={pulse}
    />
  );

  // Wheel cluster JSX (word line + wheel + action-bar; phone adds the HUD, ladder and words above)
  const wheelCluster = (
    <>

      {practice && !hideModeCoach && <WheelCoachSlot wordsFound={wordsFound.length} />}


      <div className="w-full flex flex-col gap-3 shell:gap-4 shrink-0">
        {hud}
        {ladder}
        {!inShell && <div className="w-full shell:hidden">{foundWords}</div>}
      </div>

      {showRivalLayer && <WheelPassToasts t={t} toasts={passToasts} reducedMotion={prefersReducedMotion} />}

      {/* Word line + wheel + actions centre together in the leftover height. */}
      <div className="@container/wheel [container-type:size] flex-1 flex flex-col items-center justify-center w-full min-h-0 gap-2 py-1 short:gap-0.5 short:py-0" data-testid="wheel-cluster">
      <WordWheelWordLine
        t={t}
        letters={builtLetters}
        centerLetter={puzzle.centerLetter}
        allLetters={puzzle.allLetters ?? [puzzle.centerLetter, ...puzzle.outerLetters]}
        dir={wordDir}
        onRemove={handleRemoveLetter}
        onSubmit={handleSubmit}
        isValidating={isValidating}
        pendingWord={pendingWord}
        shake={wordBuilderShake}
        feedback={feedback}
        acceptedWord={lastFoundWord}
        acceptedPoints={lastWordScore?.points ?? null}
        acceptedMultiplier={lastWordScore?.multiplier ?? null}
        acceptedGold={lastWordScore?.gold ?? false}
        acceptedId={scoreFlyId}
        reducedMotion={prefersReducedMotion}
        hint={wordsFound.length === 0}
        live={liveVerdict(builtLetters.map(bl => bl.letter).join(''), puzzle.centerLetter, wordsFound, onQuickVerdict)}
        pending={pendingLetter}
        celebrating={celebration !== null}
        banner={<WheelRushCelebration celebration={celebration} t={t} prefersReduced={prefersReducedMotion} delay={0.2} className="inset-0 items-center" />}
        className="shrink-0"
      />
      <WheelDisc
        orbitRef={wheelContainerRef}
        large={inShell}
        centerLetter={puzzle.centerLetter}
        outerLetters={outerLetters}
        builtIndices={builtLetters.map(bl => bl.wheelIndex)}
        pointerPosRef={pointerPosRef}
        draggingRef={draggingRef}
        onPointerDown={(e) => { claimPointer(e); handlePointerDown(e); }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPress={handleLetterPress}
        onHoldStart={holdPointerDown}
        onHoldEnd={holdPointerEnd}
        holdActiveIndex={holdActiveIndex}
        tileSkin={equippedTileSkin}
        fx={fx}
        release={release}
        checking={isValidating}
        reducedMotion={prefersReducedMotion}
        onPressedChange={setPendingLetter}
        goldIndex={goldIndex >= 0 ? goldIndex : null}
      >
        {/* exp-wordwheel-drag-hint-v1: idle "swipe to spell" coachmark (cyan = SP). */}
        {dragHintFtue.visible && (
          <MPDragCoachmark
            t={t}
            accent="cyan"
            onDismiss={() => {
              trackGrowthEvent('wordwheel_drag_hint_dismissed', { variant: dragHintVariant });
              dragHintFtue.dismiss();
            }}
          />
        )}
      </WheelDisc>

      <WheelActionBar
        t={t}
        hasLetters={builtLetters.length > 0}
        canSubmit={builtWord.length >= 3}
        isValidating={isValidating}
        onClear={handleClear}
        onSubmit={handleSubmit}
        onBackspace={handleBackspace}
      />
      </div>
    </>
  );

  // One tree for every screen: on desktop the GameShell frames it with rails.
  return (
    <GameShell
      mode="wheel"
      accent="lime"
      left={inShell ? (
        <>
          <div className="min-h-0 flex-1 overflow-hidden rounded-neo zone-panel-pink">
            {hideCompetitive ? (
              <div className="p-4">
                <WordWheelRankLadder t={t} score={score} thresholds={thresholds} rivals={rivals} variant="list" />
              </div>
            ) : (
              <WordWheelLiveRanks t={t} score={score} rivals={[...rivals].reverse()} />
            )}
          </div>
          <ShellKeysCard t={t} />
        </>
      ) : null}
      right={inShell ? <div className="h-full min-h-0 overflow-hidden rounded-neo zone-panel-lime">{foundWords}</div> : null}
    >
      <div
        ref={gameContainerRef}
        className={cn(
          // No bottom-stack padding: body.screen-fit-locked already reserves --bottom-stack-height.
          'relative flex flex-col items-center gap-3 w-full flex-1 min-h-0 max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-4 pb-3 rounded-neo select-none',
          'shell:max-w-none shell:h-full shell:px-0 shell:pb-0',
          equippedBoardTheme && `cosmetic-board-${equippedBoardTheme.replace('board-', '')}`,
        )}
        translate="no"
      >
        {wheelCluster}
      </div>
    </GameShell>
  );
};

export default React.memo(WordWheelGame);

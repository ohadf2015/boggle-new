/**
 * Unplugged reteach — run controller: pure reducer + wall-clock + sound/confetti.
 *
 * All game rules live in `lib/education/unpluggedReteachGame` (pure, tested).
 * This hook owns ONLY the side effects: a deadline-driven tick, the last-5s
 * beeps, the judge/finish stingers and the win confetti.
 *
 * Notes:
 * - Time comes from an absolute deadline, never a decrementing counter — a
 *   projector tab that loses focus throttles intervals and a counter drifts.
 * - Every `play*` in SoundEffectsContext is a SILENT no-op unless the game is
 *   marked active (Class-4), so `setGameActive` is wired with unmount cleanup.
 * - The NavigationContext lock (`setIsInGame(true)`) is what pulls the global
 *   mobile bottom nav off a 390px teacher phone — without it that fixed bar
 *   covers the tools strip. It and the sound gate release in the SAME effect
 *   cleanup so neither can be stranded on a screen that no longer wants it.
 * - Ref guards keep StrictMode's double-invoked effects from double-stinging.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { fireStreakConfetti, fireVictoryConfetti } from '@/utils/confettiUtils';
import {
  UNPLUGGED_FIRE_STREAK,
  bumpHands,
  createUnpluggedGame,
  currentWord,
  isPerfectRun,
  judgeWord,
  remainingMs,
  resetUnpluggedGame,
  revealWord,
  setDuration,
  startTimer,
  type UnpluggedGameState,
} from '@/lib/education/unpluggedReteachGame';

/** 100ms keeps the ring smooth; beeps are still once per integer second. */
const TICK_MS = 100;
/** Countdown turns orange + starts beeping here. */
export const UNPLUGGED_URGENT_MS = 5_000;

export interface UnpluggedRun {
  state: UnpluggedGameState;
  word: string;
  remainingMs: number;
  secondsLeft: number;
  urgent: boolean;
  perfect: boolean;
  reducedMotion: boolean;
  chooseDuration: (ms: number) => void;
  start: () => void;
  reveal: () => void;
  judge: (got: boolean) => void;
  adjustHands: (delta: number) => void;
  replay: () => void;
}

export function useUnpluggedRun(words: readonly string[]): UnpluggedRun {
  const [state, setState] = useState<UnpluggedGameState>(() => createUnpluggedGame(words));
  const [now, setNow] = useState<number>(() => Date.now());
  const reducedMotion = usePrefersReducedMotion();
  const setIsInGame = useHideNavigation();

  const {
    setGameActive,
    playCountdownBeep,
    playRoundStartSound,
    playTimesUpSound,
    playWordRevealSound,
    playWordAcceptedSound,
    playStreakMilestoneSound,
    playStreakFireSound,
    playComboBreakSound,
    playButtonClickSound,
    playCrownVictorySound,
    playEpicVictorySound,
  } = useSoundEffects();

  const beepedAtRef = useRef<number | null>(null);
  const expiredForRef = useRef<number | null>(null);
  const celebratedRef = useRef(false);
  // Read-only mirror so judge() can pick its stinger WITHOUT doing it inside a
  // setState updater (StrictMode invokes updaters twice → doubled sounds).
  const stateRef = useRef(state);
  stateRef.current = state;

  // Unlock the SFX gate + hide the global mobile bottom nav for this surface.
  // One effect, one cleanup — a split would let a new mode forget a release.
  useEffect(() => {
    setGameActive(true);
    setIsInGame(true);
    return () => {
      setGameActive(false);
      setIsInGame(false);
    };
  }, [setGameActive, setIsInGame]);

  // Wall clock, only while a countdown is actually armed.
  useEffect(() => {
    if (state.phase !== 'running') return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [state.phase, state.deadline]);

  const remaining = remainingMs(state, now);
  const secondsLeft = Math.ceil(remaining / 1000);
  const urgent = state.phase === 'running' && remaining <= UNPLUGGED_URGENT_MS;

  // Last-5s beeps (once per integer second) and the expiry auto-reveal.
  useEffect(() => {
    if (state.phase !== 'running') {
      beepedAtRef.current = null;
      return;
    }
    if (remaining <= 0) {
      if (expiredForRef.current === state.index) return;
      expiredForRef.current = state.index;
      playTimesUpSound();
      playWordRevealSound();
      setState((s) => revealWord(s, Date.now()));
      return;
    }
    if (secondsLeft <= 5 && beepedAtRef.current !== secondsLeft) {
      beepedAtRef.current = secondsLeft;
      playCountdownBeep(secondsLeft);
    }
  }, [remaining, secondsLeft, state.phase, state.index, playCountdownBeep, playTimesUpSound, playWordRevealSound]);

  const perfect = isPerfectRun(state);

  // One win moment per completed run.
  useEffect(() => {
    if (state.phase !== 'finished' || state.words.length === 0) return;
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    if (perfect) playEpicVictorySound();
    else playCrownVictorySound();
    if (!reducedMotion) fireVictoryConfetti();
  }, [state.phase, state.words.length, perfect, reducedMotion, playEpicVictorySound, playCrownVictorySound]);

  const chooseDuration = useCallback(
    (ms: number) => {
      playButtonClickSound();
      setState((s) => setDuration(s, ms));
    },
    [playButtonClickSound],
  );

  const start = useCallback(() => {
    beepedAtRef.current = null;
    playRoundStartSound();
    setState((s) => startTimer(s, Date.now()));
  }, [playRoundStartSound]);

  const reveal = useCallback(() => {
    playWordRevealSound();
    setState((s) => revealWord(s, Date.now()));
  }, [playWordRevealSound]);

  const adjustHands = useCallback((delta: number) => {
    setState((s) => bumpHands(s, delta));
  }, []);

  const judge = useCallback(
    (got: boolean) => {
      const prev = stateRef.current;
      const next = judgeWord(prev, got);
      if (got) {
        playWordAcceptedSound();
        if (next.streak === UNPLUGGED_FIRE_STREAK) {
          playStreakMilestoneSound();
          if (!reducedMotion) fireStreakConfetti();
        } else if (next.streak > UNPLUGGED_FIRE_STREAK) {
          playStreakFireSound();
        }
      } else if (prev.streak >= UNPLUGGED_FIRE_STREAK) {
        playComboBreakSound();
      } else {
        playButtonClickSound();
      }
      setState(next);
    },
    [
      reducedMotion,
      playWordAcceptedSound,
      playStreakMilestoneSound,
      playStreakFireSound,
      playComboBreakSound,
      playButtonClickSound,
    ],
  );

  const replay = useCallback(() => {
    celebratedRef.current = false;
    expiredForRef.current = null;
    beepedAtRef.current = null;
    playButtonClickSound();
    setState((s) => resetUnpluggedGame(s));
  }, [playButtonClickSound]);

  const word = useMemo(() => currentWord(state), [state]);

  return {
    state,
    word,
    remainingMs: remaining,
    secondsLeft,
    urgent,
    perfect,
    reducedMotion,
    chooseDuration,
    start,
    reveal,
    judge,
    adjustHands,
    replay,
  };
}

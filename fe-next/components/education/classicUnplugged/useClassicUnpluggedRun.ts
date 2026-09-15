/**
 * Classic Unplugged — run controller: pure reducer + sound/confetti.
 *
 * Rules live in `lib/education/classicUnpluggedGame`. This hook owns side
 * effects only (SFX gate, nav lock, stingers, confetti).
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { fireStreakConfetti, fireVictoryConfetti } from '@/utils/confettiUtils';
import {
  UNPLUGGED_FIRE_STREAK,
  createClassicUnpluggedGame,
  currentWord,
  isPerfectRun,
  resetClassicUnpluggedGame,
  revealWord,
  setTeamCount,
  submitAnswer,
  type ClassicUnpluggedGameState,
  type ClassicUnpluggedTeamCount,
} from '@/lib/education/classicUnpluggedGame';

export interface ClassicUnpluggedRun {
  state: ClassicUnpluggedGameState;
  word: string;
  perfect: boolean;
  reducedMotion: boolean;
  chooseTeams: (n: ClassicUnpluggedTeamCount) => void;
  reveal: () => void;
  submit: (got: boolean) => void;
  replay: () => void;
}

export function useClassicUnpluggedRun(words: readonly string[]): ClassicUnpluggedRun {
  const [state, setState] = useState<ClassicUnpluggedGameState>(() =>
    createClassicUnpluggedGame(words),
  );
  const reducedMotion = usePrefersReducedMotion();
  const setIsInGame = useHideNavigation();

  const {
    setGameActive,
    playWordRevealSound,
    playWordAcceptedSound,
    playStreakMilestoneSound,
    playStreakFireSound,
    playComboBreakSound,
    playButtonClickSound,
    playCrownVictorySound,
    playEpicVictorySound,
  } = useSoundEffects();

  const celebratedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setGameActive(true);
    setIsInGame(true);
    return () => {
      setGameActive(false);
      setIsInGame(false);
    };
  }, [setGameActive, setIsInGame]);

  const perfect = isPerfectRun(state);

  useEffect(() => {
    if (state.phase !== 'finished' || state.words.length === 0) return;
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    if (perfect) playEpicVictorySound();
    else playCrownVictorySound();
    if (!reducedMotion) fireVictoryConfetti();
  }, [
    state.phase,
    state.words.length,
    perfect,
    reducedMotion,
    playEpicVictorySound,
    playCrownVictorySound,
  ]);

  const chooseTeams = useCallback(
    (n: ClassicUnpluggedTeamCount) => {
      playButtonClickSound();
      setState((s) => setTeamCount(s, n));
    },
    [playButtonClickSound],
  );

  const reveal = useCallback(() => {
    playWordRevealSound();
    setState((s) => revealWord(s));
  }, [playWordRevealSound]);

  const submit = useCallback(
    (got: boolean) => {
      const prev = stateRef.current;
      const next = submitAnswer(prev, got);
      if (got) {
        playWordAcceptedSound();
        if (next.streak === UNPLUGGED_FIRE_STREAK) {
          playStreakMilestoneSound();
          if (!reducedMotion) fireStreakConfetti();
        } else if (next.streak > UNPLUGGED_FIRE_STREAK) {
          playStreakFireSound();
        }
      } else if (prev.streak >= UNPLUGGED_FIRE_STREAK) {
        playComboBreakSound(prev.streak);
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
    playButtonClickSound();
    setState((s) => resetClassicUnpluggedGame(s));
  }, [playButtonClickSound]);

  const word = useMemo(() => currentWord(state), [state]);

  return {
    state,
    word,
    perfect,
    reducedMotion,
    chooseTeams,
    reveal,
    submit,
    replay,
  };
}

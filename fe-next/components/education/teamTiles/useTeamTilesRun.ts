/**
 * Team Tiles Unplugged — run controller: pure reducer + sound/confetti.
 *
 * Rules live in `lib/education/teamTilesUnpluggedGame`. This hook owns side
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
  activeTile,
  createTeamTilesGame,
  flipTile,
  isPerfectRun,
  judgeTile,
  resetTeamTilesGame,
  setTeamCount,
  type TeamTilesGameState,
  type TeamTilesTeamCount,
} from '@/lib/education/teamTilesUnpluggedGame';

export interface TeamTilesRun {
  state: TeamTilesGameState;
  word: string;
  perfect: boolean;
  reducedMotion: boolean;
  chooseTeams: (n: TeamTilesTeamCount) => void;
  flip: (tileId: number) => void;
  judge: (got: boolean) => void;
  replay: () => void;
}

export function useTeamTilesRun(words: readonly string[]): TeamTilesRun {
  const [state, setState] = useState<TeamTilesGameState>(() =>
    createTeamTilesGame(words, { seed: 1045 }),
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
    if (state.phase !== 'finished' || state.tiles.length === 0) return;
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    if (perfect) playEpicVictorySound();
    else playCrownVictorySound();
    if (!reducedMotion) fireVictoryConfetti();
  }, [
    state.phase,
    state.tiles.length,
    perfect,
    reducedMotion,
    playEpicVictorySound,
    playCrownVictorySound,
  ]);

  const chooseTeams = useCallback(
    (n: TeamTilesTeamCount) => {
      playButtonClickSound();
      setState((s) => setTeamCount(s, n));
    },
    [playButtonClickSound],
  );

  const flip = useCallback(
    (tileId: number) => {
      playWordRevealSound();
      setState((s) => flipTile(s, tileId));
    },
    [playWordRevealSound],
  );

  const judge = useCallback(
    (got: boolean) => {
      const prev = stateRef.current;
      const next = judgeTile(prev, got);
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
    setState((s) => resetTeamTilesGame(s));
  }, [playButtonClickSound]);

  const word = useMemo(() => activeTile(state)?.word ?? '', [state]);

  return {
    state,
    word,
    perfect,
    reducedMotion,
    chooseTeams,
    flip,
    judge,
    replay,
  };
}

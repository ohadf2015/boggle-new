'use client';

/**
 * usePartySounds — Sound effects for party game modes.
 * Maps party game events (phase transitions, voting, reveals, crowning)
 * to the shared SoundEffectsContext.
 *
 * Used by: CaptionClash, ShadowClash, PixelClash (Phone + TV views).
 */

import { useCallback } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

export function usePartySounds() {
  const {
    playRoundStartSound,
    playCountdownBeep,
    playTimerUrgentSound,
    playTimesUpSound,
    playVictorySound,
    playCrownVictorySound,
    playAchievementSound,
    playButtonClickSound,
    playScreenTransitionSound,
    playPlayerJoinedSound,
    playWordRevealSound,
  } = useSoundEffects();

  /** New round / phase starts */
  const onPhaseStart = useCallback(() => {
    playRoundStartSound();
  }, [playRoundStartSound]);

  /** Countdown tick during phase timer */
  const onCountdown = useCallback((seconds: number) => {
    if (seconds <= 5 && seconds > 0) {
      playCountdownBeep(seconds);
    }
  }, [playCountdownBeep]);

  /** Timer enters urgent zone */
  const onTimerUrgent = useCallback(() => {
    playTimerUrgentSound();
  }, [playTimerUrgentSound]);

  /** Time's up for current phase */
  const onTimesUp = useCallback(() => {
    playTimesUpSound();
  }, [playTimesUpSound]);

  /** Player submits answer (caption, drawing, vote) */
  const onSubmit = useCallback(() => {
    playButtonClickSound();
  }, [playButtonClickSound]);

  /** Reveal phase — showing answers/drawings */
  const onReveal = useCallback(() => {
    playWordRevealSound();
  }, [playWordRevealSound]);

  /** Phase transition animation */
  const onPhaseTransition = useCallback(() => {
    playScreenTransitionSound();
  }, [playScreenTransitionSound]);

  /** Player voted */
  const onVote = useCallback(() => {
    playButtonClickSound();
  }, [playButtonClickSound]);

  /** Someone wins a round */
  const onRoundWinner = useCallback(() => {
    playAchievementSound();
  }, [playAchievementSound]);

  /** Final winner crowned */
  const onCrowned = useCallback(() => {
    playCrownVictorySound();
  }, [playCrownVictorySound]);

  /** Game over — results */
  const onGameOver = useCallback(() => {
    playVictorySound();
  }, [playVictorySound]);

  /** Player joined the party room */
  const onPlayerJoined = useCallback(() => {
    playPlayerJoinedSound();
  }, [playPlayerJoinedSound]);

  return {
    onPhaseStart,
    onCountdown,
    onTimerUrgent,
    onTimesUp,
    onSubmit,
    onReveal,
    onPhaseTransition,
    onVote,
    onRoundWinner,
    onCrowned,
    onGameOver,
    onPlayerJoined,
  };
}

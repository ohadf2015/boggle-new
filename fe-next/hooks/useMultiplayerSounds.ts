'use client';

/**
 * useMultiplayerSounds — Sound effects for multiplayer game events.
 * Maps multiplayer lifecycle events (match start, round start, opponent scored,
 * lead change, victory/defeat) to the shared SoundEffectsContext.
 */

import { useCallback, useRef } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

export function useMultiplayerSounds() {
  const {
    playMatchStartSound,
    playRoundStartSound,
    playCountdownBeep,
    playOpponentScoredSound,
    playLeadChangeSound,
    playVictorySound,
    playDefeatSound,
    playPlayerJoinedSound,
    playPlayerLeftSound,
    playTimerUrgentSound,
    playTimerHeartbeatSound,
    playWordAcceptedSound,
    playWordRejectedSound,
    playComboSound,
    playComboMilestoneSound,
    playComboBreakSound,
    playAchievementSound,
    playCrownVictorySound,
    playTimesUpSound,
  } = useSoundEffects();

  // Debounce lead change sounds — don't spam on rapid score updates
  const lastLeadChangeRef = useRef(0);

  const onMatchStart = useCallback(() => {
    playMatchStartSound();
  }, [playMatchStartSound]);

  const onRoundStart = useCallback(() => {
    playRoundStartSound();
  }, [playRoundStartSound]);

  const onCountdown = useCallback((seconds: number) => {
    playCountdownBeep(seconds);
  }, [playCountdownBeep]);

  const onOpponentScored = useCallback(() => {
    playOpponentScoredSound();
  }, [playOpponentScoredSound]);

  const onLeadChange = useCallback(() => {
    const now = Date.now();
    if (now - lastLeadChangeRef.current < 2000) return;
    lastLeadChangeRef.current = now;
    playLeadChangeSound();
  }, [playLeadChangeSound]);

  const onVictory = useCallback((isFirst: boolean) => {
    if (isFirst) {
      playCrownVictorySound();
    } else {
      playVictorySound();
    }
  }, [playCrownVictorySound, playVictorySound]);

  const onDefeat = useCallback(() => {
    playDefeatSound();
  }, [playDefeatSound]);

  const onPlayerJoined = useCallback(() => {
    playPlayerJoinedSound();
  }, [playPlayerJoinedSound]);

  const onPlayerLeft = useCallback(() => {
    playPlayerLeftSound();
  }, [playPlayerLeftSound]);

  const onTimerUrgent = useCallback(() => {
    playTimerUrgentSound();
  }, [playTimerUrgentSound]);

  const onTimerHeartbeat = useCallback(() => {
    playTimerHeartbeatSound();
  }, [playTimerHeartbeatSound]);

  const onTimesUp = useCallback(() => {
    playTimesUpSound();
  }, [playTimesUpSound]);

  return {
    onMatchStart,
    onRoundStart,
    onCountdown,
    onOpponentScored,
    onLeadChange,
    onVictory,
    onDefeat,
    onPlayerJoined,
    onPlayerLeft,
    onTimerUrgent,
    onTimerHeartbeat,
    onTimesUp,
    // Pass through word-level sounds for direct use
    playWordAcceptedSound,
    playWordRejectedSound,
    playComboSound,
    playComboMilestoneSound,
    playComboBreakSound,
    playAchievementSound,
  };
}

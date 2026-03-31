'use client';

import { useCallback } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

/**
 * useBlastSounds — consolidates all blast-specific sound triggers.
 * Maps blast game events to the shared SoundEffectsContext functions.
 */
export function useBlastSounds() {
  const {
    playWordAcceptedSound,
    playComboSound,
    playComboMilestoneSound,
    playComboBreakSound,
    playErrorSound,
    playAchievementSound,
    playCountdownBeep,
  } = useSoundEffects();

  /** Play tile clear sound with pitch variation based on word length */
  const playTileClear = useCallback((count: number) => {
    // Reuse word accepted; longer words feel more rewarding via the base sound
    playWordAcceptedSound();
    // For longer clears, layer a combo sound at low level for depth
    if (count >= 5) {
      playComboSound(Math.min(count - 3, 5));
    }
  }, [playWordAcceptedSound, playComboSound]);

  /** Play cascade chain sound with increasing level */
  const playCascadeChain = useCallback((level: number) => {
    playComboSound(level);
  }, [playComboSound]);

  /** Play combo activation sound — milestone for tier 2+, combo for tier 1 */
  const playComboActivation = useCallback((tier: 1 | 2 | 3) => {
    if (tier >= 2) {
      playComboMilestoneSound(tier === 3 ? 15 : 10);
    } else {
      playComboSound(3);
    }
  }, [playComboMilestoneSound, playComboSound]);

  /** Play wave clear celebration sound */
  const playWaveClear = useCallback(() => {
    playAchievementSound();
  }, [playAchievementSound]);

  /** Play countdown beep at 3, 2, 1 moves remaining */
  const playMoveWarning = useCallback((movesLeft: number) => {
    if (movesLeft >= 1 && movesLeft <= 3) {
      playCountdownBeep(movesLeft);
    }
  }, [playCountdownBeep]);

  /** Play word rejection sound */
  const playWordReject = useCallback(() => {
    playErrorSound();
  }, [playErrorSound]);

  /** Play combo timeout / break sound */
  const playComboTimeout = useCallback(() => {
    playComboBreakSound(1);
  }, [playComboBreakSound]);

  return {
    playTileClear,
    playCascadeChain,
    playComboActivation,
    playWaveClear,
    playMoveWarning,
    playWordReject,
    playComboTimeout,
  };
}

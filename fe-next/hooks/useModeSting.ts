/**
 * useModeSting — Play mode-specific sound stings for game events
 *
 * Maps game modes (classic, word-hunt, blast, etc.) to appropriate sound
 * effects that play on mode transitions and key game events (start, win, lose).
 *
 * All sounds are delegated to useSoundEffects context, which handles
 * muting, volume, and game-active guards automatically.
 *
 * @example
 * ```tsx
 * const { playModeSound } = useModeSting();
 *
 * // Play start sound for the current mode
 * playModeSound('classic', 'start');
 *
 * // Play win sound
 * playModeSound('blast', 'win');
 * ```
 */

import { useCallback } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';

type ModeEvent = 'start' | 'win' | 'lose' | 'round-end';

export function useModeSting() {
  const soundContext = useSoundEffects();

  const playModeSound = useCallback(
    (mode: ClassroomGameMode, event: ModeEvent) => {
      if (!soundContext) return;

      // Map each mode + event combination to the appropriate sound play function.
      // Event 'win' and 'lose' always use victory/defeat sounds regardless of mode.
      // Event 'start' uses mode-specific stings; 'round-end' uses general cascade.

      if (event === 'win') {
        soundContext.playVictorySound();
        return;
      }

      if (event === 'lose') {
        soundContext.playDefeatSound();
        return;
      }

      if (event === 'round-end') {
        soundContext.playCoinCascadeSound();
        return;
      }

      // event === 'start' — play mode-specific sting
      switch (mode) {
        case 'classic':
          soundContext.playMatchFoundSound();
          break;
        case 'word-hunt':
          soundContext.playWordRevealSound();
          break;
        case 'blast':
          soundContext.playFlashChallengeSound();
          break;
        case 'wheel-rush':
          soundContext.playWheelSpinSound();
          break;
        case 'vocab-quiz':
          soundContext.playMatchFoundSound();
          break;
        default:
          // Fallback for any new modes added later
          soundContext.playMatchFoundSound();
      }
    },
    [soundContext]
  );

  return { playModeSound };
}

export default useModeSting;

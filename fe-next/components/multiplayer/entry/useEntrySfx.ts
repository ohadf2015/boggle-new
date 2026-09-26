'use client';

import { useMemo } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

/**
 * The entry's sound cues, each tied to the player's own action. The entry is
 * not a game screen, so every cue opts out of the SFX context's "game active"
 * gate; mute, volume and the audio unlock stay the context's call.
 */
export function useEntrySfx() {
  const { playSound } = useSoundEffects();
  return useMemo(
    () => ({
      /** A code character landed in its box. */
      tick: () => void playSound('tileSelect', { requiresGameActive: false, volume: 0.25 }),
      /** The sixth character locked the code in. */
      lock: () => void playSound('pathConnect', { requiresGameActive: false, volume: 0.35 }),
      /** A sheet popped open. */
      open: () => void playSound('menuOpen', { requiresGameActive: false, volume: 0.3 }),
      /** A fresh avatar rolled in. */
      pop: () => void playSound('tileAppear', { requiresGameActive: false, volume: 0.3 }),
    }),
    [playSound],
  );
}

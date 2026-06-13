import { useEffect } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

/**
 * Tells the sound system that a game mode is actively being played, so its
 * per-action sounds are audible.
 *
 * Why this exists: `playSound` defaults `requiresGameActive: true` and silently
 * no-ops unless `setGameActive(true)` has been called. Several full-screen game
 * modes (Word Tower, Word Forge) author all their SFX but never flip this flag,
 * so EVERY per-action sound is dropped and the mode plays in silence. This hook
 * flips game-active on for the lifetime of the playing screen and guarantees it
 * is cleared on exit/unmount, so it can never leak into another mode.
 *
 * The drill modes have their own thin equivalent (`useDrillGameActive`); this is
 * the generic version for non-drill modes.
 *
 * @param active true while the mode is in a playing state
 */
export function useGameActiveSound(active: boolean): void {
  const { setGameActive } = useSoundEffects();
  useEffect(() => {
    setGameActive(active);
    return () => setGameActive(false);
  }, [active, setGameActive]);
}

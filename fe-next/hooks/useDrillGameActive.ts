import { useEffect } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

/**
 * Tells the sound system that a brain-training drill is actively being played.
 *
 * Why this exists: `playSound` defaults `requiresGameActive: true` and no-ops
 * unless `setGameActive(true)` has been called. Drill routes never called it, so
 * every per-action drill sound (combo, word-accepted, timer-urgent, ...) was
 * silently dropped. This hook flips game-active on during play and guarantees it
 * is cleared on exit/unmount, so it can never leak into other game modes.
 *
 * @param active true while the drill is in a playing/recall/feedback phase
 */
export function useDrillGameActive(active: boolean): void {
  const { setGameActive } = useSoundEffects();
  useEffect(() => {
    setGameActive(active);
    return () => setGameActive(false);
  }, [active, setGameActive]);
}

'use client';

import { useReducedMotion } from 'framer-motion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';

/**
 * Motion + sound for Teacher HQ, in one place.
 *
 * `reduced` is true when EITHER the OS asks for reduced motion or the player
 * turned heavy effects off in-app — the same pair adventure and Word Tower
 * honour. Sound comes from the shared SoundEffects context (NOOPs without a
 * provider, so tests and SSR are silent).
 */
export function useHqJuice() {
  const osReduced = useReducedMotion();
  const [appReduced] = useReducedEffects();
  const sfx = useSoundEffects();
  return { reduced: Boolean(osReduced) || appReduced, sfx };
}

export default useHqJuice;

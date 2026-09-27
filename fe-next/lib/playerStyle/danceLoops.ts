/**
 * The shipped transparent dancing-mascot loops, as a flat ordered list.
 *
 * Every non-`default` player style ships a genre dancing loop (see
 * animatedMascots.ts). The hero only ever shows the player's OWN style, so these
 * lovingly-made loops are otherwise unseen by everyone else. This list lets
 * personality surfaces (splash, loaders) rotate through all of them — the cube
 * mascot headbanging, doing a K-pop point, a salsa step — instead of one static
 * pose.
 *
 * `pickDanceLoop` is deterministic: the same seed always yields the same loop, so
 * a server-rendered loader and its client hydration never disagree on which
 * mascot to show (no hydration mismatch, no flash).
 */

import { STYLE_KEYS, type PlayerStyleKey } from './styles';
import { ANIMATED_STYLE_MASCOTS } from './animatedMascots';

export interface DanceLoop {
  key: PlayerStyleKey;
  src: string;
}

/** One entry per non-default style that ships a real animated loop, in picker order. */
export const DANCE_LOOPS: DanceLoop[] = STYLE_KEYS.flatMap((key) => {
  if (key === 'default') return [];
  const src = ANIMATED_STYLE_MASCOTS[key];
  return src ? [{ key, src }] : [];
});

/**
 * Deterministically pick a dance loop from a non-negative-or-negative integer
 * seed. Wraps modulo the list length so any integer is valid, and normalises
 * negatives so `-1` maps to the last loop rather than throwing.
 */
export function pickDanceLoop(seed = 0): DanceLoop {
  const n = DANCE_LOOPS.length;
  const i = (((Math.floor(seed) % n) + n) % n) || 0;
  return DANCE_LOOPS[i];
}

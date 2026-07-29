/**
 * blastMascot — pure mascot expression selector for Blast Mode.
 *
 * Maps run state (wave archetype, final results) to one of six mascot
 * expressions. Used by the results screen header and (Phase B) wave intro.
 * Zero React, zero state — testable in isolation.
 *
 * The image paths live here as strings (not imports) so the module stays
 * serializable for telemetry and SSR, mirroring the icon-name pattern used
 * in `blastBadges.ts`. The UI layer renders them through `next/image`.
 *
 * Priority ladder for `getMascotForResults`:
 *   1. new personal best          → celebrating
 *   2. big combo (>= 8) without PB → hyped
 *   3. decent run (>= 2 waves)    → neutral
 *   4. flameout (0-1 waves)       → sadSmile
 *
 * Future keys (`sneaky`, `sweating`) are currently reached only through the
 * archetype selector — the results ladder deliberately keeps them out so
 * the post-run emotional arc stays focused on win/loss.
 */
import type { BlastResultsData } from '../types';
import type { BlastWaveArchetype } from './blastWaveConfig';

export type MascotKey =
  | 'hyped'
  | 'sneaky'
  | 'sweating'
  | 'celebrating'
  | 'sadSmile'
  | 'neutral';

/**
 * Public-asset paths. Phase B will drop the actual PNGs at these locations;
 * until then the paths are reserved and the alt-text keys are the user-facing
 * fallback. Keeping the registry here (vs. per-call string literals) means the
 * results screen only needs to know the `MascotKey` — paths are swappable.
 */
export const MASCOT_IMAGES: Record<MascotKey, string> = {
  hyped: '/mascot-new-onfire.jpg',
  sneaky: '/mascot-new-explorer.jpg',
  sweating: '/mascot-new-scared.jpg',
  celebrating: '/mascot-new-trophy.jpg',
  sadSmile: '/mascot-new-oops.jpg',
  neutral: '/mascot-new-main.jpg',
};

/** Static map: each wave archetype has one "signature" expression. */
const ARCHETYPE_TO_MASCOT: Record<BlastWaveArchetype, MascotKey> = {
  normal: 'neutral',
  scoreRush: 'hyped',
  treasureHunt: 'sneaky',
  survival: 'sweating',
  silence: 'neutral',
};

/** Pure: archetype → mascot. Used by wave-intro (Phase B). */
export function getMascotForArchetype(archetype: BlastWaveArchetype): MascotKey {
  return ARCHETYPE_TO_MASCOT[archetype];
}

/** Big-combo threshold for the "hyped" branch of the results ladder. */
const BIG_COMBO_THRESHOLD = 8;
/** Minimum waves cleared to avoid the "flameout" branch. */
const DECENT_RUN_MIN_WAVES = 2;

/**
 * Pure: finished-run state → mascot expression.
 * See the priority ladder in the file-level JSDoc.
 */
export function getMascotForResults(results: BlastResultsData): MascotKey {
  const beatPB =
    results.previousBest != null && results.finalScore > results.previousBest;
  if (beatPB) return 'celebrating';

  if (results.maxCombo >= BIG_COMBO_THRESHOLD) return 'hyped';

  if (results.wavesCompleted >= DECENT_RUN_MIN_WAVES) return 'neutral';

  return 'sadSmile';
}

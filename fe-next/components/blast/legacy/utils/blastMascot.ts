/**
 * blastMascot — pure mascot expression selector for Blast Mode.
 *
 * Maps a wave archetype to one of six mascot expressions.
 * Zero React, zero state — testable in isolation.
 *
 * The image paths live here as strings (not imports) so the module stays
 * serializable for telemetry and SSR, mirroring the icon-name pattern used
 * in `blastBadges.ts`. The UI layer renders them through `next/image`.
 */
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


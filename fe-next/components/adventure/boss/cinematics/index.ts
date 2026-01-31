/**
 * Boss Cinematics Module
 *
 * Remotion-based cinematic sequences for boss battles.
 * Includes entrance and defeat cinematics with full animation support.
 *
 * @module cinematics
 */

// ==============================================
// COMPONENTS
// ==============================================

export { CinematicPlayer } from './CinematicPlayer';
export type { CinematicPlayerProps } from './CinematicPlayer';

export { BossEntranceCinematic, ENTRANCE_DURATION_FRAMES } from './BossEntranceCinematic';
export type { BossEntranceCinematicProps } from './BossEntranceCinematic';

export { BossDefeatCinematic, DEFEAT_DURATION_FRAMES } from './BossDefeatCinematic';
export type { BossDefeatCinematicProps } from './BossDefeatCinematic';

// ==============================================
// CONSTANTS
// ==============================================

/** Default FPS for all cinematics */
export const CINEMATIC_FPS = 30;

/** Entrance cinematic duration in seconds */
export const ENTRANCE_DURATION_SECONDS = 8;

/** Defeat cinematic duration in seconds */
export const DEFEAT_DURATION_SECONDS = 8;

// ==============================================
// HOOK RE-EXPORT
// ==============================================

export {
  useCinematic,
  SKIP_DELAY_MS,
  DEFAULT_FPS,
  DEFAULT_DURATION_FRAMES,
  secondsToFrames,
  framesToSeconds,
  framesToMs,
} from '../../../../hooks/useCinematic';
export type { UseCinematicOptions, UseCinematicReturn } from '../../../../hooks/useCinematic';

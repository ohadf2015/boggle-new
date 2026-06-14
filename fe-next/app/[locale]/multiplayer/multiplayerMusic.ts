/**
 * Pure decision for which music bed the multiplayer screen should play.
 *
 * Three phases, driven by the gameState store:
 *   - waiting in the room  → `lobby`
 *   - 3-2-1 countdown      → `beforeGame`   (showStartAnimation === true)
 *   - actually playing      → `inGame`       (countdown finished)
 *
 * Returns `null` while results are showing so the caller leaves whatever is
 * already playing (results has its own audio handling).
 *
 * Extracted as a pure function so it can be unit-tested without mounting the
 * large, socket-driven multiplayer PageClient.
 */
export type MultiplayerMusicTrack = 'lobby' | 'beforeGame' | 'inGame';

export interface MultiplayerMusicInput {
  /** Game has started (covers both countdown and active play). */
  isActive: boolean;
  /** Results screen is up — don't touch the music. */
  showResults: boolean;
  /** The 3-2-1 start countdown overlay is on screen. */
  showStartAnimation: boolean;
}

export function resolveMultiplayerMusicTrack({
  isActive,
  showResults,
  showStartAnimation,
}: MultiplayerMusicInput): MultiplayerMusicTrack | null {
  if (showResults) return null;
  if (!isActive) return 'lobby';
  if (showStartAnimation) return 'beforeGame';
  return 'inGame';
}

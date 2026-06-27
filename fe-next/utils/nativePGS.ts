/**
 * Native Play Games Services (PGS) bridge
 *
 * Android-only Google Play Games Services integration built on
 * @openforge/capacitor-game-connect. Mirrors the conventions in
 * `utils/nativeOAuth.ts`: a module-level singleton, dynamic import (so the
 * remote web bundle builds with the plugin absent), `isAndroid()` guards, and
 * graceful results that NEVER throw to the caller.
 *
 * IMPORTANT — auth orthogonality: PGS `signIn()` is a Games-scoped flow and is
 * intentionally kept separate from the Supabase identity session created by
 * `utils/nativeOAuth.ts`. Do not route PGS tokens into Supabase, and do not
 * cross-trigger one flow from the other — they are independent surfaces.
 *
 * Scope: Android only (the Play Console PGS config is Android). The plugin also
 * supports iOS Game Center, but that needs separate App Store Connect config —
 * deferred. Off Android every export is a no-op returning `unavailable`.
 *
 * Native completion (NOT done in JS): after `cap sync`, the Android build must
 * compile the plugin and the app must run as a signed build whose cert matches
 * a Play Console PGS credential. Achievement/leaderboard IDs must first be
 * defined in Play Console — this bridge only passes IDs through.
 */

import type { CapacitorGameConnectPlugin } from '@openforge/capacitor-game-connect';
import { isAndroid } from '@/utils/platform';
import logger from '@/utils/logger';

/** Result shape for actions that do not return data. */
export interface PlayGamesResult {
  success: boolean;
  error?: string;
}

/** Result of a PGS sign-in. */
export interface PlayGamesSignInResult extends PlayGamesResult {
  playerId?: string;
  playerName?: string;
}

let plugin: CapacitorGameConnectPlugin | null = null;
let initialized = false;
/**
 * Cached result of the last successful Play Games sign-in. Populated by
 * `signInPlayGames()` (whether triggered silently at app-start by
 * `NativePGSInitializer` or explicitly from the profile card) so UI can show
 * "connected" state without re-prompting. Null until a sign-in succeeds.
 */
let lastSignIn: PlayGamesSignInResult | null = null;

/** Reset module state — test-only. */
export function __resetForTesting(): void {
  plugin = null;
  initialized = false;
  lastSignIn = null;
}

/** The cached successful sign-in (player id/name), or null if never signed in. */
export function getCachedPlayGamesSignIn(): PlayGamesSignInResult | null {
  return lastSignIn;
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Lazily import + cache the plugin. Returns true once available on Android.
 * Idempotent: subsequent calls reuse the cached plugin.
 */
export async function initializePlayGames(): Promise<boolean> {
  if (!isAndroid()) {
    logger.log('[PGS] Not Android, skipping Play Games initialization');
    return false;
  }

  if (initialized && plugin) {
    return true;
  }

  try {
    const mod = await import('@openforge/capacitor-game-connect');
    plugin = mod.CapacitorGameConnect;
    initialized = true;
    logger.log('[PGS] Play Games bridge initialized');
    return true;
  } catch (error) {
    logger.error('[PGS] Failed to initialize Play Games bridge:', error);
    plugin = null;
    initialized = false;
    return false;
  }
}

/** True when the bridge has been initialized and the plugin is available. */
export function isPlayGamesAvailable(): boolean {
  return isAndroid() && initialized && plugin !== null;
}

/**
 * Resolve the plugin, lazily initializing. Null when unavailable (web/iOS).
 * Never rejects — any init/import failure resolves to null, so callers (and the
 * fire-and-forget award path) can never surface an unhandled rejection.
 */
async function ensurePlugin(): Promise<CapacitorGameConnectPlugin | null> {
  try {
    if (!isPlayGamesAvailable()) {
      await initializePlayGames();
    }
  } catch {
    return null;
  }
  return isPlayGamesAvailable() ? plugin : null;
}

/**
 * Sign the player in to Play Games (Games-scoped — NOT the Supabase session).
 */
export async function signInPlayGames(): Promise<PlayGamesSignInResult> {
  const p = await ensurePlugin();
  if (!p) return { success: false, error: 'Play Games not available' };

  try {
    const { player_id, player_name } = await p.signIn();
    logger.log('[PGS] Signed in:', player_id);
    lastSignIn = { success: true, playerId: player_id, playerName: player_name };
    return lastSignIn;
  } catch (error) {
    logger.log('[PGS] Sign-in failed/cancelled:', errMessage(error));
    return { success: false, error: errMessage(error) };
  }
}

/** Submit a score to a Play Games leaderboard. */
export async function submitLeaderboardScore(
  leaderboardID: string,
  totalScoreAmount: number,
): Promise<PlayGamesResult> {
  const p = await ensurePlugin();
  if (!p) return { success: false, error: 'Play Games not available' };

  try {
    await p.submitScore({ leaderboardID, totalScoreAmount });
    return { success: true };
  } catch (error) {
    logger.error('[PGS] submitScore failed:', error);
    return { success: false, error: errMessage(error) };
  }
}

/** Unlock a Play Games achievement. */
export async function unlockAchievement(achievementID: string): Promise<PlayGamesResult> {
  const p = await ensurePlugin();
  if (!p) return { success: false, error: 'Play Games not available' };

  try {
    await p.unlockAchievement({ achievementID });
    return { success: true };
  } catch (error) {
    logger.error('[PGS] unlockAchievement failed:', error);
    return { success: false, error: errMessage(error) };
  }
}

/** Increment progress of an incremental Play Games achievement. */
export async function incrementAchievement(
  achievementID: string,
  pointsToIncrement: number,
): Promise<PlayGamesResult> {
  const p = await ensurePlugin();
  if (!p) return { success: false, error: 'Play Games not available' };

  try {
    await p.incrementAchievementProgress({ achievementID, pointsToIncrement });
    return { success: true };
  } catch (error) {
    logger.error('[PGS] incrementAchievementProgress failed:', error);
    return { success: false, error: errMessage(error) };
  }
}

/** Open the native Play Games leaderboard UI. */
export async function showLeaderboard(leaderboardID: string): Promise<PlayGamesResult> {
  const p = await ensurePlugin();
  if (!p) return { success: false, error: 'Play Games not available' };

  try {
    await p.showLeaderboard({ leaderboardID });
    return { success: true };
  } catch (error) {
    logger.error('[PGS] showLeaderboard failed:', error);
    return { success: false, error: errMessage(error) };
  }
}

/** Open the native Play Games achievements UI. */
export async function showAchievements(): Promise<PlayGamesResult> {
  const p = await ensurePlugin();
  if (!p) return { success: false, error: 'Play Games not available' };

  try {
    await p.showAchievements();
    return { success: true };
  } catch (error) {
    logger.error('[PGS] showAchievements failed:', error);
    return { success: false, error: errMessage(error) };
  }
}

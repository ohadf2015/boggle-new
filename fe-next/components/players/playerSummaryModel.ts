/**
 * Pure rules for the player summary card a board opens when you tap a player.
 * No React, no I/O.
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

/** What the board already knows about the row — shown at once, before any fetch. */
export interface PlayerSummarySeed {
  /** Account id. Absent on id-free boards (daily combined) and for guests/bots. */
  id?: string | null;
  /** Opaque daily-board row key; a signed-in viewer can trade it for the id. */
  boardKey?: string | null;
  name: string;
  avatarImage?: string | null;
  customAvatar?: CustomAvatarConfig | null;
  countryCode?: string | null;
  title?: string | null;
}

/**
 * How the card can reach the full profile:
 * - `id`: known account → fetch stats, link to the profile.
 * - `boardKey`: signed-in row on an id-free board, viewer signed in → resolve, then as `id`.
 * - `signIn`: signed-in row on an id-free board, viewer is a guest → row info + sign-in hint.
 * - `rowOnly`: board key but nothing to resolve it with (no board date) → row info only.
 * - `guest`: guest/bot row → row info only, there is no profile.
 */
export type SummaryAccess = 'id' | 'boardKey' | 'signIn' | 'rowOnly' | 'guest';

export function summaryAccess(
  seed: Pick<PlayerSummarySeed, 'id' | 'boardKey'>,
  viewer: { isAuthenticated: boolean; canResolveBoardKey: boolean },
): SummaryAccess {
  if (seed.id) return 'id';
  if (!seed.boardKey) return 'guest';
  if (!viewer.isAuthenticated) return 'signIn';
  return viewer.canResolveBoardKey ? 'boardKey' : 'rowOnly';
}

/** True when tapping the player should open the card (anything a profile can back). */
export function hasSummary(seed: Pick<PlayerSummarySeed, 'id' | 'boardKey'>): boolean {
  return !!(seed.id || seed.boardKey);
}

export function playerProfileHref(language: string, id: string): string {
  return `/${language || 'en'}/player/${encodeURIComponent(id)}`;
}

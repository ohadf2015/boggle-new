/**
 * Word Tower — "there's something new in the menu" indicator (pure + storage).
 *
 * Every secondary action (upgrades, skin picker, leaderboard) folds behind ONE
 * collapsed menu button, which is good for a clean top bar and terrible for
 * discovery: a skin unlocked at a new personal best was announced once, in a
 * toast, and then lived inside a button that looks identical whether or not it
 * holds anything new (founder 2026-08-14).
 *
 * The seen-marker is written when the menu is OPENED, not when it is dismissed —
 * a reload between "opened it" and "closed it" would otherwise re-raise the dot
 * forever (the same shape as the style-popup re-show incidents; see
 * .claude/rules/60-recurring-pitfalls.md, Class 1).
 */

import { DEFAULT_SKIN_ID, unlockedSkinIds, type TowerSkinId } from './skins';

export const SEEN_SKINS_STORAGE_KEY = 'wordTower_seenSkins';

/** Skins the player owns but has not opened the menu to look at yet.
 *  The default skin is never news — everyone starts with it. */
export function unseenSkinIds(bestHeightM: number, seen: ReadonlyArray<string>): TowerSkinId[] {
  const seenSet = new Set(seen);
  return unlockedSkinIds(bestHeightM).filter((id) => id !== DEFAULT_SKIN_ID && !seenSet.has(id));
}

/** Seen-skin ids from storage; `[]` on SSR, privacy mode or a corrupt blob. */
export function readSeenSkins(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_SKINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Merge ids into the seen set (never replaces — an older unlock stays seen). */
export function markSkinsSeen(ids: ReadonlyArray<string>): void {
  if (ids.length === 0) return;
  try {
    const merged = Array.from(new Set([...readSeenSkins(), ...ids]));
    localStorage.setItem(SEEN_SKINS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* privacy mode — the dot simply comes back next session */
  }
}

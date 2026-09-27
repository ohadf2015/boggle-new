/**
 * Dismissal persistence for the avatar-customization nudge.
 *
 * Gentle by design: a dismissal snoozes the hint for 30 days (and once the user
 * actually customizes, the server flag suppresses it forever). Storage is
 * incognito-safe via storageHelpers (localStorage → sessionStorage fallback).
 */
import { getFromStorage, saveToStorage } from '@/utils/storageHelpers';

export const AVATAR_NUDGE_DISMISS_DAYS = 30;
const DISMISS_KEY = 'lc:avatar-nudge-dismissed-until';
const DAY_MS = 86_400_000;

/** Timestamp (ms) until which the nudge stays snoozed, or null if never dismissed. */
export function getAvatarNudgeDismissedUntil(): number | null {
  const raw = getFromStorage(DISMISS_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Snooze the nudge for AVATAR_NUDGE_DISMISS_DAYS from `now`. */
export function dismissAvatarNudge(now: number): void {
  saveToStorage(DISMISS_KEY, String(now + AVATAR_NUDGE_DISMISS_DAYS * DAY_MS));
}

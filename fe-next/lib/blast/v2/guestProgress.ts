/**
 * Guest (logged-out) Blast v2 progress — Plan 3b.
 *
 * Logged-out players can't persist server-side (writes are auth-gated, and
 * coins/chests need a user_id), but we still keep their *level position* across
 * refreshes via localStorage so they don't get bounced back to level 1.
 *
 * SSR-safe: every accessor guards `typeof window` and swallows storage errors,
 * so it's a no-op during server render / in private-mode quota failures.
 */

export const GUEST_PROGRESS_KEY = 'blast-v2-progress';

export type GuestProgress = {
  currentLevel: number;
  locale: string;
};

export function readGuestProgress(): GuestProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GUEST_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestProgress>;
    const currentLevel = parsed?.currentLevel;
    if (typeof currentLevel !== 'number' || !Number.isFinite(currentLevel) || currentLevel < 1) {
      return null;
    }
    const locale = typeof parsed.locale === 'string' ? parsed.locale : 'en';
    return { currentLevel, locale };
  } catch {
    return null;
  }
}

export function writeGuestProgress(progress: GuestProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // best-effort — ignore quota / disabled-storage failures
  }
}

export function clearGuestProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_PROGRESS_KEY);
  } catch {
    // best-effort
  }
}

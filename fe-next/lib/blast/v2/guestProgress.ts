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

// Paint-only fast path: the level we expect to resume at, cached for EVERY user
// (guest or authed) so the page can decide synchronously whether to instant-
// paint level 1 or hold the boot loader for a resume. Never a source of truth —
// the real resume level always comes from the server GET / guest claim — so a
// stale/forged hint only costs an unnecessary loader or a one-time level swap.
export const RESUME_HINT_KEY = 'blast-v2-resume-hint';

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

export function readResumeHint(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RESUME_HINT_KEY);
    if (!raw) return null;
    const level = Number(raw);
    if (!Number.isInteger(level) || level < 1) return null;
    return level;
  } catch {
    return null;
  }
}

export function writeResumeHint(level: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RESUME_HINT_KEY, String(level));
  } catch {
    // best-effort
  }
}

/**
 * The Academy's daily chest: one per student per local calendar day.
 *
 * One source of truth for "opened today" — this device's storage, keyed by user
 * so a shared classroom tablet does not hand one student's chest to the next.
 * The marker is written when the chest OPENS (not when the reveal is
 * dismissed), so a reload mid-reveal cannot re-open it (pitfall class 1).
 *
 * XP rides the existing `/api/education/record-xp` route; `daily_challenge` is
 * on its allow-list and the lesson id is a fixed tag (the route only needs it
 * non-empty).
 */

export const DAILY_CHEST_XP = 25;
const KEY_PREFIX = 'lexiclash.academy.dailyChest.';
const CHEST_LESSON_TAG = 'academy-daily-chest';

export function localDay(now: Date): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function canOpenChest(userId: string, now: Date): boolean {
  try {
    return window.localStorage.getItem(KEY_PREFIX + userId) !== localDay(now);
  } catch {
    return true;
  }
}

export function markChestOpened(userId: string, now: Date): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, localDay(now));
  } catch {
    // Storage blocked (private window): the chest just opens again tomorrow-or-sooner.
  }
}

/** The XP never landed: give the chest back so the student can try again. */
export function clearChestOpened(userId: string): void {
  try {
    window.localStorage.removeItem(KEY_PREFIX + userId);
  } catch {
    // nothing to undo
  }
}

export type ChestClaim = { ok: true; newTotalXp?: number } | { ok: false };

export async function claimDailyChestXp(fetchImpl: typeof fetch = fetch): Promise<ChestClaim> {
  try {
    const res = await fetchImpl('/api/education/record-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xpAmount: DAILY_CHEST_XP,
        lessonId: CHEST_LESSON_TAG,
        activityType: 'daily_challenge',
      }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { newTotalXp?: unknown };
    const total = Number(data?.newTotalXp);
    return Number.isFinite(total) ? { ok: true, newTotalXp: total } : { ok: true };
  } catch {
    return { ok: false };
  }
}

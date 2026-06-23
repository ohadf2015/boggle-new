/**
 * Native in-app review nudge — the "seed reviews" lever.
 *
 * Wraps @capacitor-community/in-app-review (Google Play In-App Review API).
 * Mirrors the conventions in `utils/nativePGS.ts`: dynamic import (so the
 * remote web bundle builds with the plugin absent), `isAndroid()` guard, and a
 * fire-and-forget call that NEVER throws to the caller.
 *
 * Why gate it: a no-review listing is the conversion gate (see memory
 * android-store-visits-pretraction). But Play quotas the review sheet and
 * prompting on the first-ever win reads as desperate, so we ask only after a
 * couple of wins and at most once per throttle window. The native API ALSO
 * decides whether to actually surface the sheet — this gate just avoids
 * burning that quota on low-intent moments.
 *
 * Off Android (web / iOS shell) every export is a safe no-op.
 */

import { isAndroid } from '@/utils/platform';
import logger from '@/utils/logger';

export const REVIEW_WIN_THRESHOLD = 2;
export const REVIEW_THROTTLE_MS = 45 * 24 * 60 * 60 * 1000; // 45 days

const WIN_COUNT_KEY = 'lc_review_win_count';
const LAST_PROMPTED_KEY = 'lc_review_prompted_at';

/**
 * Pure gating decision: should we surface the review sheet on this win?
 * Prompt once win count reaches the threshold, then never more often than the
 * throttle window allows.
 */
export function shouldRequestReviewAfterWin(args: {
  winCount: number;
  lastPromptedAtMs: number | null;
  nowMs: number;
}): boolean {
  const { winCount, lastPromptedAtMs, nowMs } = args;
  if (winCount < REVIEW_WIN_THRESHOLD) return false;
  if (lastPromptedAtMs != null && nowMs - lastPromptedAtMs < REVIEW_THROTTLE_MS) return false;
  return true;
}

function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Call once per game win. Increments the local win counter and, when the gate
 * opens, asks the native API to show the review sheet. Fire-and-forget.
 */
export async function maybeRequestReviewAfterWin(): Promise<void> {
  if (!isAndroid() || typeof localStorage === 'undefined') return;
  try {
    const winCount = (readNumber(WIN_COUNT_KEY) ?? 0) + 1;
    localStorage.setItem(WIN_COUNT_KEY, String(winCount));

    if (!shouldRequestReviewAfterWin({
      winCount,
      lastPromptedAtMs: readNumber(LAST_PROMPTED_KEY),
      nowMs: Date.now(),
    })) {
      return;
    }

    // Record the attempt BEFORE awaiting so a throttle holds even if the
    // sheet is quota-suppressed by Play.
    localStorage.setItem(LAST_PROMPTED_KEY, String(Date.now()));
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  } catch (err) {
    logger.warn('[nativeReview] requestReview failed (non-fatal)', err);
  }
}

/**
 * Per-locale, per-mode practice completion tracking.
 *
 * Lives in localStorage so the hub tile, sandbox, and chain CTA can all
 * read state without prop-drilling. Every write fires `practice:progress`
 * on `window` so listeners can re-render without polling.
 *
 * Goals (auto-trigger thresholds): classic & wheel = N words found,
 * wordHunt = solve the target. The sandboxes call `markPracticeMode` once
 * the player crosses these — keeps sandbox + tracking decoupled.
 */
import type { PracticeMode } from './practiceTutorialSteps';
import { recordPracticeSession } from '@/hooks/usePracticeStreak';

const KEY_PREFIX = 'lc_practice_done_v1';
const PROGRESS_EVENT = 'practice:progress';

export const PRACTICE_GOALS: Record<PracticeMode, number> = {
  classic: 3,
  wordHunt: 1,
  wheelRush: 3,
};

const storageKey = (locale: string) => `${KEY_PREFIX}_${locale}`;

const safeRead = (locale: string): Set<string> => {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = window.localStorage.getItem(storageKey(locale));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const safeWrite = (locale: string, set: Set<string>): void => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey(locale), JSON.stringify([...set]));
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { locale } }));
  } catch {
    // private/quota — fail silent. Practice still works, just no persistence.
  }
};

export function markPracticeMode(mode: PracticeMode, locale: string): void {
  // Always tick the streak — even on replay-of-already-complete-mode the next
  // day, the player put in real work and deserves the streak credit. The hook
  // self-debounces same-UTC-day calls so multi-completion in one day is safe.
  recordPracticeSession();

  const done = safeRead(locale);
  if (done.has(mode)) return;
  done.add(mode);
  safeWrite(locale, done);
}

export function isPracticeModeComplete(mode: PracticeMode, locale: string): boolean {
  return safeRead(locale).has(mode);
}

export function getCompletedPracticeModes(locale: string): Set<PracticeMode> {
  return safeRead(locale) as Set<PracticeMode>;
}

/**
 * Mark every practice mode as complete without ticking the daily streak.
 * Used by the hub "Skip All" CTA — bypasses tutorials on revisit while
 * being honest about what the user actually played (no fake streak credit).
 */
export function markAllPracticeModesSkipped(locale: string): void {
  const set = new Set<string>(['classic', 'wordHunt', 'wheelRush']);
  safeWrite(locale, set);
}

export function resetPracticeProgress(locale: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(storageKey(locale));
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { locale } }));
  } catch {
    // ignore
  }
}

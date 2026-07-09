/**
 * Daily Flow — chain the day's daily challenges into a single guided run.
 *
 * Problem it solves: each daily mode (Word Hunt, Word Wheel, …) is its own
 * screen with its own "start" CTA. A player who wants to clear the day has to
 * bounce back to the hub and re-arm a fresh CTA for every mode — friction that
 * quietly bleeds off "daily" players before they finish. The Flow lets them
 * commit to the whole set in one gesture: play a challenge, get a short breath
 * between rounds, roll straight into the next — and pause/resume any time.
 *
 * This module owns ONLY the flow's state:
 *  - pure step/progress helpers (no storage, fully testable), and
 *  - a small localStorage-backed session that survives the per-route navigation
 *    between challenges and auto-expires when the daily date rolls over.
 *
 * "Played" status is NOT stored here — it's derived by the caller from the
 * existing per-mode result storage (hasPlayedWordHuntToday, …) and injected as a
 * {@link PlayedMap}. That keeps the flow a thin coordinator over the real source
 * of truth (a completed challenge), so a reload / cross-tab / cross-device
 * completion can never desync the flow from reality.
 */

import type { Language } from '@/types';
import type { DailyModeId } from '@/lib/dailyModes';
import { getDailyChallengeDate } from './dateUtils';
import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
  removeFromLocalStorage,
} from '@/utils/storageHelpers';

/** localStorage key for the single in-progress flow session (per browser). */
export const DAILY_FLOW_KEY = 'lexiclash_daily_flow';

/** A step in the flow is just a daily mode. */
export type DailyFlowStepId = DailyModeId;

export type DailyFlowStatus = 'active' | 'paused' | 'completed';

export interface DailyFlowSession {
  /** Daily date this flow belongs to; a new day discards it. */
  date: string;
  /** Language the flow was started in (keeps per-mode routing consistent). */
  language: Language;
  /** Ordered challenges to run, front to back. */
  steps: DailyFlowStepId[];
  /**
   * Fast flow: auto-advance through the between-round breather instead of
   * waiting for an explicit tap. The player chooses this at start time.
   */
  fast: boolean;
  status: DailyFlowStatus;
  startedAt: string;
}

/** Which steps the player has already completed today. Missing = not played. */
export type PlayedMap = Partial<Record<DailyFlowStepId, boolean>>;

// ==========================================
// Pure helpers (no storage / no clock)
// ==========================================

/** First step in the flow the player hasn't cleared yet, or null if all done. */
export function nextFlowStep(
  session: Pick<DailyFlowSession, 'steps'>,
  played: PlayedMap,
): DailyFlowStepId | null {
  for (const step of session.steps) {
    if (!played[step]) return step;
  }
  return null;
}

/** How many of the flow's steps are cleared, against the total. */
export function flowProgress(
  session: Pick<DailyFlowSession, 'steps'>,
  played: PlayedMap,
): { done: number; total: number } {
  const done = session.steps.reduce((n, step) => (played[step] ? n + 1 : n), 0);
  return { done, total: session.steps.length };
}

/** True once every step in a non-empty flow is cleared. */
export function isFlowComplete(
  session: Pick<DailyFlowSession, 'steps'>,
  played: PlayedMap,
): boolean {
  if (session.steps.length === 0) return false;
  return nextFlowStep(session, played) === null;
}

// ==========================================
// Session storage lifecycle
// ==========================================

export interface StartDailyFlowInput {
  language: Language;
  steps: DailyFlowStepId[];
  fast: boolean;
  /** Override the daily date (tests); defaults to today's daily date. */
  date?: string;
}

/** Begin (or restart) a flow for today and persist it as active. */
export function startDailyFlow(input: StartDailyFlowInput): DailyFlowSession {
  const session: DailyFlowSession = {
    date: input.date ?? getDailyChallengeDate(),
    language: input.language,
    steps: input.steps,
    fast: input.fast,
    status: 'active',
    startedAt: new Date().toISOString(),
  };
  saveJsonToLocalStorage(DAILY_FLOW_KEY, session);
  return session;
}

/**
 * The current flow session, or null if there is none / it belongs to a past
 * day. A stale session is cleared as a side effect so callers never resurrect
 * yesterday's run.
 */
export function getDailyFlowSession(today?: string): DailyFlowSession | null {
  const session = getJsonFromLocalStorage<DailyFlowSession | null>(DAILY_FLOW_KEY, null);
  if (!session) return null;
  const currentDate = today ?? getDailyChallengeDate();
  if (session.date !== currentDate) {
    removeFromLocalStorage(DAILY_FLOW_KEY);
    return null;
  }
  return session;
}

/** Mutate the current session's status; no-op (returns null) if none exists. */
export function setDailyFlowStatus(status: DailyFlowStatus): DailyFlowSession | null {
  const session = getDailyFlowSession();
  if (!session) return null;
  const updated: DailyFlowSession = { ...session, status };
  saveJsonToLocalStorage(DAILY_FLOW_KEY, updated);
  return updated;
}

/** Player stepped away — keep the run but stop auto-advancing. */
export function pauseDailyFlow(): DailyFlowSession | null {
  return setDailyFlowStatus('paused');
}

/** Player came back — re-arm the run. */
export function resumeDailyFlow(): DailyFlowSession | null {
  return setDailyFlowStatus('active');
}

/** The whole set is cleared — mark the run finished (kept for the finale UI). */
export function completeDailyFlow(): DailyFlowSession | null {
  return setDailyFlowStatus('completed');
}

/** Forget the flow entirely. */
export function clearDailyFlow(): void {
  removeFromLocalStorage(DAILY_FLOW_KEY);
}

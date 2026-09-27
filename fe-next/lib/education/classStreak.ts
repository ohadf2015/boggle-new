/**
 * Class streak for async miss-gap homework completions.
 *
 * Classroom-level (not per-student): on-time homework days in a row feed a
 * shared streak the teacher can celebrate. Device-local storage — same privacy
 * stance as guest practice (#972): no roster, no student names, no server PII.
 *
 * A completion only counts when it happens on or before the assignment due date.
 */

import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';
import {
  isDueDateOnOrAfter,
  normalizeDueDate,
  todayUtcDate,
} from './missGapAsyncAssignment';

export interface ClassStreakState {
  /** Consecutive on-time homework days ending at lastCompletionDate. */
  currentStreak: number;
  /** YYYY-MM-DD of the most recent counted completion day. */
  lastCompletionDate: string | null;
  /** Distinct completion days (UTC), newest last — capped. */
  completionDays: string[];
}

export const EMPTY_CLASS_STREAK: ClassStreakState = {
  currentStreak: 0,
  lastCompletionDate: null,
  completionDays: [],
};

const MAX_DAYS = 120;

const storageKey = (classKey: string) =>
  `lexiclash_class_streak_${encodeURIComponent(classKey)}`;

function consecutiveEndingAt(days: string[], end: string): number {
  const set = new Set(days);
  let streak = 0;
  const cursor = new Date(`${end}T00:00:00.000Z`);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function readClassStreak(classKey: string): ClassStreakState {
  if (!classKey) return { ...EMPTY_CLASS_STREAK };
  const stored = getJsonFromLocalStorage<Partial<ClassStreakState>>(
    storageKey(classKey),
    {},
  );
  const completionDays = Array.isArray(stored?.completionDays)
    ? stored!.completionDays.filter((d) => normalizeDueDate(d)).slice(-MAX_DAYS)
    : [];
  const lastCompletionDate =
    typeof stored?.lastCompletionDate === 'string'
      ? normalizeDueDate(stored.lastCompletionDate) || null
      : completionDays.length
        ? completionDays[completionDays.length - 1]
        : null;
  const currentStreak =
    lastCompletionDate != null
      ? consecutiveEndingAt(completionDays, lastCompletionDate)
      : 0;
  return { currentStreak, lastCompletionDate, completionDays };
}

function write(classKey: string, state: ClassStreakState): ClassStreakState {
  saveJsonToLocalStorage(storageKey(classKey), state);
  return state;
}

export interface RecordClassHomeworkArgs {
  classKey: string;
  /** Assignment due date YYYY-MM-DD — required for an on-time count. */
  dueDate: string;
  /** Completion day YYYY-MM-DD; defaults to today UTC. */
  completedOn?: string;
}

/**
 * Record an on-time homework completion toward the class streak.
 * Late / missing due date → no streak change (returns current state + contributed:false).
 */
export function recordClassHomeworkCompletion(
  args: RecordClassHomeworkArgs,
): ClassStreakState & { contributed: boolean } {
  const dueDate = normalizeDueDate(args.dueDate);
  const completedOn = normalizeDueDate(args.completedOn || todayUtcDate());
  const current = readClassStreak(args.classKey);

  if (!args.classKey || !dueDate || !completedOn) {
    return { ...current, contributed: false };
  }
  if (!isDueDateOnOrAfter(dueDate, completedOn)) {
    return { ...current, contributed: false };
  }
  if (current.completionDays.includes(completedOn)) {
    return { ...current, contributed: false };
  }

  const completionDays = [...current.completionDays, completedOn].slice(-MAX_DAYS);
  const next: ClassStreakState = {
    completionDays,
    lastCompletionDate: completedOn,
    currentStreak: consecutiveEndingAt(completionDays, completedOn),
  };
  write(args.classKey, next);
  return { ...next, contributed: true };
}

/** Pure check — does this completion feed the streak? */
export function contributesToClassStreak(
  dueDate: string,
  completedOn: string = todayUtcDate(),
): boolean {
  return isDueDateOnOrAfter(dueDate, completedOn);
}

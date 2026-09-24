/**
 * Device storage for the Missed Words Review Leitner boxes, keyed PER STUDENT
 * (classroom Chromebooks are shared — a global key would hand one student's
 * boxes to the next).
 *
 * ponytail: v1 is localStorage only, so boxes do not follow a student across
 * devices. Upgrade path: the per-student SM-2 table `word_review_state`
 * (student_id, lesson_id, word) already exists behind
 * `/api/education/spaced-repetition` — move the schedule there and delete this
 * file. Do NOT write both stores at once (two sources of truth).
 */

import type { LeitnerEntry, LeitnerState } from './missedWordsReview';

const PREFIX = 'academy_review_leitner_v1:';

export const leitnerStorageKey = (studentId: string) => `${PREFIX}${studentId}`;

function isEntry(v: unknown): v is LeitnerEntry {
  const e = v as LeitnerEntry;
  return !!e && typeof e.box === 'number' && typeof e.due === 'number' && typeof e.lapses === 'number';
}

export function loadLeitnerState(studentId: string): LeitnerState {
  try {
    const raw = localStorage.getItem(leitnerStorageKey(studentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: LeitnerState = {};
    for (const [k, v] of Object.entries(parsed ?? {})) if (isEntry(v)) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export function saveLeitnerState(studentId: string, state: LeitnerState): void {
  try {
    localStorage.setItem(leitnerStorageKey(studentId), JSON.stringify(state));
  } catch {
    /* private mode / quota — the run still counted for XP */
  }
}

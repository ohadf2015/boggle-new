/**
 * Per-student learning arc — the free teacher analytics unit.
 *
 * `buildClassMastery` answers "which words is the class stuck on". This module
 * answers the question the reports page drills into: *how is THIS student
 * doing over time* — and it does so for the whole roster, because a flat
 * ranking built only on session evidence hides the student who never played.
 *
 * Everything here is a pure fold over `ClassMastery` + a roster list, so the
 * sorting and zero-evidence rules are testable without a database.
 */

import type { ClassMastery, ClassStuckWord } from './wordMasteryTrend';

export interface ArcRosterEntry {
  studentId: string;
  name: string;
}

export interface ClassArcRow extends ArcRosterEntry {
  mastered: number;
  improving: number;
  stuck: number;
  /** False when no asked-session ever recorded this student. */
  hasEvidence: boolean;
  /** ISO time of their latest asked session, or null. */
  lastActive: string | null;
}

/**
 * One row per ROSTER student — students with no evidence sort last but are
 * never dropped. Stuck-first: the students who need a follow-up sit on top.
 */
export function buildClassArcRows(
  mastery: ClassMastery | null,
  roster: readonly ArcRosterEntry[]
): ClassArcRow[] {
  const byStudent = new Map((mastery?.students ?? []).map((s) => [s.studentId, s]));

  const rows: ClassArcRow[] = roster.map(({ studentId, name }) => {
    const student = byStudent.get(studentId);
    if (!student) {
      return { studentId, name, mastered: 0, improving: 0, stuck: 0, hasEvidence: false, lastActive: null };
    }

    let mastered = 0;
    let improving = 0;
    let stuck = 0;
    let lastActive: string | null = null;
    for (const word of student.words) {
      if (word.trend === 'mastered') mastered += 1;
      else if (word.trend === 'improving') improving += 1;
      else if (word.trend === 'stuck') stuck += 1;
      else continue; // insufficient evidence carries no recency signal either
      if (!lastActive || word.lastSeen > lastActive) lastActive = word.lastSeen;
    }
    return { studentId, name, mastered, improving, stuck, hasEvidence: true, lastActive };
  });

  rows.sort(
    (a, b) =>
      Number(b.hasEvidence) - Number(a.hasEvidence) ||
      b.stuck - a.stuck ||
      b.improving - a.improving ||
      a.name.localeCompare(b.name)
  );
  return rows;
}

/** Cap on a generated follow-up lesson; past this it stops being a review. */
export const FOLLOW_UP_WORD_LIMIT = 10;

/**
 * The remediation payload: display forms of the words the most students are
 * stuck on, worst first, deduped case-insensitively — different sessions can
 * spell the same word with trailing-space drift.
 */
export function pickFollowUpWords(
  classStuckWords: readonly ClassStuckWord[],
  limit: number = FOLLOW_UP_WORD_LIMIT
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const stuck of classStuckWords) {
    const display = (stuck.display || stuck.word || '').trim();
    const key = display.toLocaleLowerCase();
    if (!display || seen.has(key)) continue;
    seen.add(key);
    out.push(display);
    if (out.length >= limit) break;
  }
  return out;
}

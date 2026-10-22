import type { ClassroomSummary } from '@/shared/types/classroom';

export interface MissedWord {
  word: string;
  found: number;
  of: number;
  /** The board never carried it, so 0 finders says nothing about the class. */
  notOnBoard?: boolean;
}

function studentNames(summary: ClassroomSummary): string[] {
  const host = (summary.teacherName ?? '').trim().toLowerCase();
  return Object.keys(summary.masteryByPlayer ?? {}).filter((name) => name.trim().toLowerCase() !== host);
}

/**
 * Lesson words fewer than half the students found, fewest finders first. The wall
 * lists exactly these and the replay stages exactly these, so the two cannot drift.
 */
export function mostMissedWords(summary: ClassroomSummary): MissedWord[] {
  if (!summary.totalWords) return [];
  const students = studentNames(summary);
  if (students.length === 0) return [];
  const isStudent = new Set(students);
  const of = students.length;
  const unplaced = new Set((summary.neverPlacedWords ?? []).map((w) => w.toLowerCase()));
  const row = (word: string, found: number): MissedWord =>
    unplaced.has(word.toLowerCase()) ? { word, found, of, notOnBoard: true } : { word, found, of };

  if (!summary.coverage?.length) {
    return (summary.missedWords ?? []).map((word) => row(word, 0));
  }
  return summary.coverage
    .map((c) => row(c.word, c.foundBy.filter((name) => isStudent.has(name)).length))
    .filter((w) => w.found * 2 < of)
    .sort((a, b) => a.found - b.found);
}

/** What a replay sends: every lesson word unfound is the whole lesson again, which is Play again, not a replay. */
export function reteachList(summary: ClassroomSummary): MissedWord[] {
  const struggled = mostMissedWords(summary);
  return struggled.length < summary.totalWords ? struggled : [];
}

/** How many students found under half the lesson. A count only: the projector never names a struggling child. */
export function studentsUnderHalf(summary: ClassroomSummary): number {
  const students = studentNames(summary);
  if (students.length < 2) return 0;
  return students.filter((name) => {
    const m = summary.masteryByPlayer[name];
    return m && m.total > 0 && m.found * 2 < m.total;
  }).length;
}

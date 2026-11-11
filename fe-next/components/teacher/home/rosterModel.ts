/** done = practised in the last 7 days, late = practised before that only, idle = never practised. */
export type RosterStatus = 'done' | 'late' | 'idle';

export interface RosterStudentInput {
  studentId: string;
  displayName: string;
  avatarConfig?: Record<string, unknown> | null;
  totalXp: number;
  /** The level the student sees on their own screens; absent on older reads. */
  currentLevel?: number | null;
  wordsMastered: number;
  wordsAttempted: number;
  overallAccuracy: number;
  currentStreak: number;
  lastPracticeDate: string | null;
}

export interface RosterRow {
  id: string;
  name: string;
  avatarConfig: Record<string, unknown> | null;
  xp: number;
  /** null when the read has no level yet, so the UI never shows "Level 0". */
  level: number | null;
  wordsMastered: number;
  wordsAttempted: number;
  accuracy: number;
  streak: number;
  lastPracticeDate: string | null;
  status: RosterStatus;
}

const WEEK_MS = 7 * 86_400_000;

export function rosterStatus(lastPracticeDate: string | null, nowMs: number): RosterStatus {
  if (!lastPracticeDate) return 'idle';
  const at = Date.parse(lastPracticeDate);
  if (Number.isNaN(at)) return 'idle';
  return nowMs - at < WEEK_MS ? 'done' : 'late';
}

export function rosterRows(students: readonly RosterStudentInput[], nowMs: number): RosterRow[] {
  return students
    .map((s) => ({
      id: s.studentId,
      name: s.displayName,
      avatarConfig: s.avatarConfig ?? null,
      xp: s.totalXp,
      level: typeof s.currentLevel === 'number' && s.currentLevel >= 1 ? Math.floor(s.currentLevel) : null,
      wordsMastered: s.wordsMastered,
      wordsAttempted: s.wordsAttempted,
      accuracy: s.overallAccuracy,
      streak: s.currentStreak,
      lastPracticeDate: s.lastPracticeDate,
      status: rosterStatus(s.lastPracticeDate, nowMs),
    }))
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
}

export function rosterCounts(rows: readonly RosterRow[]): Record<RosterStatus, number> {
  const out: Record<RosterStatus, number> = { done: 0, late: 0, idle: 0 };
  for (const r of rows) out[r.status] += 1;
  return out;
}

export function rosterFilter(rows: readonly RosterRow[], status: RosterStatus | null): readonly RosterRow[] {
  return status ? rows.filter((r) => r.status === status) : rows;
}

/** Share of answers right, 0..1; null before the student has answered anything, so the meter never shows a fake 0%. */
export function rosterAccuracy(row: Pick<RosterRow, 'accuracy' | 'wordsAttempted'>): number | null {
  if (row.wordsAttempted <= 0) return null;
  return Math.min(1, Math.max(0, row.accuracy / 100));
}

/** Below this share a student is struggling, the same line the class analytics use. */
export const ACCURACY_LOW = 0.6;

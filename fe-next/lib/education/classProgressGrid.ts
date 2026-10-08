/**
 * Class progress grid — students × assignments, plus the weekly paste.
 *
 * Reuses the assignment-progress score (`mapProgressRowToCompletion` →
 * `gradePercentFromProgress`). `student_lesson_progress` has no best-word
 * column; the best word is the longest word the student got right
 * (`words_attempted.correct > 0`, plus `words_mastered`). Ties break on
 * code-unit order so the cell is stable.
 *
 * The weekly summary covers assignments whose `due_date` falls in the ISO
 * week of `now` (UTC, Monday-start, end exclusive). A class with nothing
 * dated this week summarizes every assignment instead, so the paste is
 * never an empty "0 due" when the grid itself has work on it.
 */

import {
  mapProgressRowToCompletion,
  type AssignmentProgressSourceRow,
} from './assignmentProgressReport';

export type ClassGridStatus = 'completed' | 'missing';

export interface ClassGridStudent {
  id: string;
  name: string;
}

export interface ClassGridAssignment {
  id: string;
  title: string;
  dueDate: string | null;
}

export interface ClassGridCompletion {
  assignmentId: string;
  studentId: string;
  score: number | null;
  bestWord: string | null;
}

export interface ClassGridCell {
  status: ClassGridStatus;
  score: number | null;
  bestWord: string | null;
}

export interface ClassProgressGrid {
  students: ClassGridStudent[];
  assignments: ClassGridAssignment[];
  /** `cells[studentIndex][assignmentIndex]`, same order as the two lists. */
  cells: ClassGridCell[][];
}

export interface WeeklySummary {
  className: string;
  /** 'week' when at least one assignment is due this ISO week, else 'all'. */
  scope: 'week' | 'all';
  dueCount: number;
  /** Assignments in the reported set that every student has completed. */
  completedCount: number;
  topWords: string[];
  needsAttention: { studentId: string; name: string; missingCount: number }[];
}

export interface WeeklySummaryLabels {
  due: string;
  completed: string;
  topWords: string;
  attention: string;
  none: string;
  missing: (name: string, count: number) => string;
}

const TOP_WORD_LIMIT = 5;
const DAY_MS = 86_400_000;

function wordLength(word: string): number {
  return Array.from(word).length;
}

function compareWords(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function finiteCorrect(entry: unknown): number | null {
  if (!entry || typeof entry !== 'object') return null;
  const correct = (entry as { correct?: unknown }).correct;
  return typeof correct === 'number' && Number.isFinite(correct) ? correct : null;
}

/** Longest word the student got right, or null when nothing was. */
export function bestWordFromProgress(row: {
  words_attempted?: Record<string, unknown> | null;
  words_mastered?: string[] | null;
}): string | null {
  const good = new Set<string>();
  const attempts = row.words_attempted;
  if (attempts && typeof attempts === 'object' && !Array.isArray(attempts)) {
    for (const [word, entry] of Object.entries(attempts)) {
      const trimmed = word.trim();
      const correct = finiteCorrect(entry);
      if (trimmed && correct != null && correct > 0) good.add(trimmed);
    }
  }
  if (Array.isArray(row.words_mastered)) {
    for (const word of row.words_mastered) {
      if (typeof word !== 'string') continue;
      const trimmed = word.trim();
      if (trimmed) good.add(trimmed);
    }
  }
  if (good.size === 0) return null;
  const ranked = [...good].sort((a, b) => {
    const byLength = wordLength(b) - wordLength(a);
    if (byLength !== 0) return byLength;
    return compareWords(a, b);
  });
  return ranked[0] ?? null;
}

/** One progress row → the cell inputs. Score matches the assignment list. */
export function classGridCompletionFromRow(
  assignmentId: string,
  row: AssignmentProgressSourceRow,
): ClassGridCompletion {
  const mapped = mapProgressRowToCompletion(assignmentId, row);
  return {
    assignmentId,
    studentId: row.student_id,
    score: mapped.score ?? null,
    bestWord: bestWordFromProgress(row),
  };
}

function betterCompletion(current: ClassGridCompletion, next: ClassGridCompletion): ClassGridCompletion {
  const currentScore = current.score ?? -1;
  const nextScore = next.score ?? -1;
  if (nextScore !== currentScore) return nextScore > currentScore ? next : current;
  const currentLen = current.bestWord ? wordLength(current.bestWord) : 0;
  const nextLen = next.bestWord ? wordLength(next.bestWord) : 0;
  if (nextLen !== currentLen) return nextLen > currentLen ? next : current;
  return current;
}

export function buildClassProgressGrid(args: {
  students: ClassGridStudent[];
  assignments: ClassGridAssignment[];
  completions: ClassGridCompletion[];
}): ClassProgressGrid {
  const { students, assignments, completions } = args;
  const byPair = new Map<string, ClassGridCompletion>();
  const studentIds = new Set(students.map((s) => s.id));
  const assignmentIds = new Set(assignments.map((a) => a.id));
  for (const completion of completions) {
    if (!studentIds.has(completion.studentId) || !assignmentIds.has(completion.assignmentId)) continue;
    const key = `${completion.studentId}\0${completion.assignmentId}`;
    const prev = byPair.get(key);
    byPair.set(key, prev ? betterCompletion(prev, completion) : completion);
  }

  const cells = students.map((student) =>
    assignments.map((assignment) => {
      const hit = byPair.get(`${student.id}\0${assignment.id}`);
      if (!hit) return { status: 'missing' as const, score: null, bestWord: null };
      return {
        status: 'completed' as const,
        score: hit.score,
        bestWord: hit.bestWord,
      };
    }),
  );

  return { students, assignments, cells };
}

function utcIsoWeekBounds(now: number): { start: number; end: number } {
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const day = new Date(midnight).getUTCDay() || 7;
  const start = midnight - (day - 1) * DAY_MS;
  return { start, end: start + 7 * DAY_MS };
}

function parseDueMs(due: string | null): number | null {
  if (!due) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due.trim());
  if (dateOnly) {
    const ms = Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = Date.parse(due);
  return Number.isFinite(ms) ? ms : null;
}

function assignmentIndexesDueThisWeek(assignments: ClassGridAssignment[], now: number): number[] {
  const { start, end } = utcIsoWeekBounds(now);
  const inWeek: number[] = [];
  assignments.forEach((assignment, index) => {
    const due = parseDueMs(assignment.dueDate);
    if (due != null && due >= start && due < end) inWeek.push(index);
  });
  return inWeek;
}

export function buildWeeklySummary(args: {
  className: string;
  grid: ClassProgressGrid;
  now?: number;
}): WeeklySummary {
  const { className, grid } = args;
  const now = args.now ?? Date.now();
  const inWeek = assignmentIndexesDueThisWeek(grid.assignments, now);
  const scope: WeeklySummary['scope'] = inWeek.length > 0 ? 'week' : 'all';
  const indexes = scope === 'week' ? inWeek : grid.assignments.map((_, i) => i);

  let completedCount = 0;
  const wordCounts = new Map<string, number>();
  const attention: WeeklySummary['needsAttention'] = [];

  if (grid.students.length > 0) {
    for (const index of indexes) {
      const allDone = grid.students.every((_, studentIndex) => grid.cells[studentIndex]?.[index]?.status === 'completed');
      if (allDone) completedCount += 1;
    }
    grid.students.forEach((student, studentIndex) => {
      let missingCount = 0;
      for (const index of indexes) {
        const cell = grid.cells[studentIndex]?.[index];
        if (!cell || cell.status !== 'completed') {
          missingCount += 1;
          continue;
        }
        if (cell.bestWord) wordCounts.set(cell.bestWord, (wordCounts.get(cell.bestWord) ?? 0) + 1);
      }
      if (missingCount > 0) {
        attention.push({ studentId: student.id, name: student.name, missingCount });
      }
    });
  }

  attention.sort((a, b) => b.missingCount - a.missingCount || compareWords(a.name, b.name));

  const topWords = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1] || compareWords(a[0], b[0]))
    .slice(0, TOP_WORD_LIMIT)
    .map(([word]) => word);

  return {
    className,
    scope,
    dueCount: indexes.length,
    completedCount,
    topWords,
    needsAttention: attention,
  };
}

export function formatWeeklySummary(summary: WeeklySummary, labels: WeeklySummaryLabels): string {
  const words = summary.topWords.length > 0 ? summary.topWords.join(', ') : labels.none;
  const who =
    summary.needsAttention.length > 0
      ? summary.needsAttention.map((student) => labels.missing(student.name, student.missingCount)).join(', ')
      : labels.none;
  return [
    summary.className,
    `${labels.due}: ${summary.dueCount} · ${labels.completed}: ${summary.completedCount}`,
    `${labels.topWords}: ${words}`,
    `${labels.attention}: ${who}`,
  ].join('\n');
}

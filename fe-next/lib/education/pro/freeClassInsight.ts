import type { ClassAnalytics } from './classAnalyticsServer';
import type { StudentStatus } from './classInsights';
import { MIN_ATTEMPTS_TO_RANK, type HardWord } from '@/lib/education/wordMasteryReport';
import { normalizeForStorage } from '@/lib/supabase/education/types';

const ATTENTION: readonly StudentStatus[] = ['needsHelp', 'inactive', 'notStarted'];
const STATUSES: readonly StudentStatus[] = ['needsHelp', 'inactive', 'notStarted', 'steady', 'thriving'];

export interface FreeClassPulse {
  needsHelp: { id: string; status: StudentStatus }[];
  counts: Record<StudentStatus, number>;
  totalStudents: number;
}

/** What a free teacher's analytics read returns for their one free class: this week only, no per-student numbers. */
export interface FreeClassInsight {
  pulse: FreeClassPulse;
  hardestWords: HardWord[];
  sessionsThisWeek: number;
}

const createdMs = (iso: string) => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
};

/** The class a free teacher gets this week's insight for: their oldest. Server and Home both call this. */
export function freeInsightClassId(rows: readonly { id: string; created_at: string }[]): string | null {
  const sorted = [...rows].sort((a, b) => createdMs(a.created_at) - createdMs(b.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sorted[0]?.id ?? null;
}

export function toFreeClassPulse(metrics: ClassAnalytics): FreeClassPulse {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<StudentStatus, number>;
  const needsHelp: FreeClassPulse['needsHelp'] = [];
  for (const s of metrics.students) {
    if (!STATUSES.includes(s.status)) continue;
    counts[s.status]++;
    if (ATTENTION.includes(s.status)) needsHelp.push({ id: s.id, status: s.status });
  }
  return { needsHelp, counts, totalStudents: metrics.totalStudents };
}

interface WeekRow {
  studentId: string;
  results: unknown;
}

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];

/**
 * Board rounds never store what was asked, so the lesson words they put in play are found + missed.
 * Words nobody found all week lead the list.
 */
export function rankWeekHardestWords(rows: readonly WeekRow[], limit: number): { hardestWords: HardWord[]; sessions: number } {
  const byWord = new Map<string, { display: string; attempts: number; found: number; asked: Set<string>; finders: Set<string> }>();
  const seen = new Set<string>();
  let sessions = 0;
  for (const row of rows) {
    const blob = row.results && typeof row.results === 'object' && !Array.isArray(row.results) ? (row.results as Record<string, unknown>) : null;
    if (!blob || typeof row.studentId !== 'string') continue;
    const found = strings(blob.lessonWordsFound);
    const askedList = strings(blob.lessonWordsAsked);
    const inPlay = askedList.length > 0 ? askedList : [...found, ...strings(blob.lessonWordsMissed)];
    if (inPlay.length === 0) continue;
    const code = typeof blob.gameCode === 'string' ? blob.gameCode : '';
    const key = `${code}|${row.studentId}`;
    if (code && seen.has(key)) continue;
    seen.add(key);
    sessions++;
    const foundKeys = new Set(found.map((w) => normalizeForStorage(w)));
    for (const display of new Set(inPlay)) {
      const word = normalizeForStorage(display);
      const t = byWord.get(word) ?? { display, attempts: 0, found: 0, asked: new Set<string>(), finders: new Set<string>() };
      t.attempts++;
      t.asked.add(row.studentId);
      if (foundKeys.has(word)) {
        t.found++;
        t.finders.add(row.studentId);
      }
      byWord.set(word, t);
    }
  }
  const hardestWords = [...byWord.entries()]
    .filter(([, t]) => t.found < t.attempts && t.attempts >= MIN_ATTEMPTS_TO_RANK)
    .map(([word, t]): HardWord => ({
      word,
      display: t.display,
      attempts: t.attempts,
      missed: t.attempts - t.found,
      missRate: Math.round(((t.attempts - t.found) / t.attempts) * 100),
      studentsMissing: t.asked.size - t.finders.size,
      studentsAsked: t.asked.size,
    }))
    .sort((a, b) => Number(b.missed === b.attempts) - Number(a.missed === a.attempts) || b.missRate - a.missRate || b.missed - a.missed || a.word.localeCompare(b.word))
    .slice(0, limit);
  return { hardestWords, sessions };
}

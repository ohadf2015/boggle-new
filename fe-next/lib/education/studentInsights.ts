/**
 * One student's progress, distilled into what a parent or teacher can act on.
 * Pure: the same rows always give the same result, so the parent page and the
 * teacher's student view can never disagree. Output is machine codes and
 * numbers only — every label is translated at render.
 */

import { percent, summarizeTally, tallyStudentWords } from './wordTally';

export interface InsightProgressRow {
  total_xp: number | null;
  words_mastered: string[] | null;
  words_attempted: Record<string, { correct?: number; attempts?: number; lastAttemptAt?: string } | null> | null;
  completed_at: string | null;
  current_streak: number | null;
  longest_streak: number | null;
}

export interface InsightSessionRow {
  completed_at: string | null;
  words_attempted: number | null;
  words_correct: number | null;
  time_spent_seconds: number | null;
  duration_seconds: number | null;
}

export interface WeekActivity {
  sessions: number;
  minutes: number;
  activeDays: number;
  accuracy: number | null;
}

export interface WordInsight {
  word: string;
  accuracy: number | null;
  attempts: number;
}

export type InsightCode = 'quiet' | 'started_this_week' | 'more_active' | 'less_active' | 'steady' | 'paused';
export type ActivityCode = 'practice_weak_words' | 'celebrate_wins' | 'short_daily_session';

export interface StudentInsights {
  totalXp: number;
  lessonsCompleted: number;
  wordsMastered: number;
  wordsPracticed: number;
  accuracy: number | null;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  sessionsCompleted: number;
  thisWeek: WeekActivity;
  lastWeek: WeekActivity;
  wordsToPractice: WordInsight[];
  recentWins: WordInsight[];
  insight: InsightCode;
  activity: ActivityCode;
}

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const LIST_LIMIT = 5;
const MIN_ATTEMPTS = 2;
const WEAK_BELOW = 70;
const WIN_FROM = 80;

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const sessionSeconds = (row: InsightSessionRow): number => num(row.time_spent_seconds) || num(row.duration_seconds);

function weekOf(rows: InsightSessionRow[], from: number, to: number): WeekActivity {
  let sessions = 0;
  let seconds = 0;
  let correct = 0;
  let attempted = 0;
  const days = new Set<string>();
  for (const row of rows) {
    if (!row.completed_at) continue;
    const at = Date.parse(row.completed_at);
    if (!(at > from && at <= to)) continue;
    sessions += 1;
    seconds += sessionSeconds(row);
    correct += num(row.words_correct);
    attempted += num(row.words_attempted);
    days.add(new Date(at).toISOString().slice(0, 10));
  }
  return { sessions, minutes: Math.round(seconds / 60), activeDays: days.size, accuracy: percent(correct, attempted) };
}

function insightFor(thisWeek: WeekActivity, lastWeek: WeekActivity): InsightCode {
  const now = thisWeek.sessions;
  const before = lastWeek.sessions;
  if (now === 0) return before === 0 ? 'quiet' : 'paused';
  if (before === 0) return 'started_this_week';
  if (now > before) return 'more_active';
  if (now < before) return 'less_active';
  return 'steady';
}

export function buildStudentInsights(input: {
  progressRows: InsightProgressRow[];
  sessionRows: InsightSessionRow[];
  now: Date;
}): StudentInsights {
  const { progressRows, sessionRows } = input;
  const now = input.now.getTime();

  let totalXp = 0;
  let lessonsCompleted = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  for (const row of progressRows) {
    totalXp += num(row.total_xp);
    if (row.completed_at) lessonsCompleted += 1;
    currentStreak = Math.max(currentStreak, num(row.current_streak));
    longestStreak = Math.max(longestStreak, num(row.longest_streak));
  }

  const words = tallyStudentWords(progressRows);
  const { wordsMastered, wordsPracticed, accuracy } = summarizeTally(words);

  const entries = [...words.entries()].map(([word, w]) => ({ word, ...w, accuracy: percent(w.correct, w.attempts) }));
  const toInsight = (e: (typeof entries)[number]): WordInsight => ({ word: e.word, accuracy: e.accuracy, attempts: e.attempts });

  const wordsToPractice = entries
    .filter((e) => !e.mastered && e.attempts >= MIN_ATTEMPTS && (e.accuracy ?? 0) < WEAK_BELOW)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0) || b.attempts - a.attempts || a.word.localeCompare(b.word))
    .slice(0, LIST_LIMIT)
    .map(toInsight);

  const recentWins = entries
    .filter((e) => e.mastered || (e.attempts >= MIN_ATTEMPTS && (e.accuracy ?? 0) >= WIN_FROM))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt) || (b.accuracy ?? -1) - (a.accuracy ?? -1) || a.word.localeCompare(b.word))
    .slice(0, LIST_LIMIT)
    .map(toInsight);

  const completedSessions = sessionRows.filter((row) => row.completed_at);
  const totalSeconds = completedSessions.reduce((sum, row) => sum + sessionSeconds(row), 0);
  const thisWeek = weekOf(sessionRows, now - WEEK_MS, now);
  const lastWeek = weekOf(sessionRows, now - 2 * WEEK_MS, now - WEEK_MS);

  const activity: ActivityCode =
    wordsToPractice.length > 0 ? 'practice_weak_words' : recentWins.length > 0 ? 'celebrate_wins' : 'short_daily_session';

  return {
    totalXp,
    lessonsCompleted,
    wordsMastered,
    wordsPracticed,
    accuracy,
    currentStreak,
    longestStreak,
    totalMinutes: Math.round(totalSeconds / 60),
    sessionsCompleted: completedSessions.length,
    thisWeek,
    lastWeek,
    wordsToPractice,
    recentWins,
    insight: insightFor(thisWeek, lastWeek),
    activity,
  };
}

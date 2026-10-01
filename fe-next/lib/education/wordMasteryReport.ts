/**
 * Teacher Pro per-word mastery report, folded from `buildClassMastery` output so
 * the free arc and the paid report always read the same evidence.
 *
 * Pure: the API route owns auth, the Pro check and the DB read.
 */

import type { ClassMastery } from '@/lib/education/wordMasteryTrend';

export const HARDEST_WORDS_LIMIT = 10;
export const FREE_PREVIEW_WORDS = 3;
export const HEATMAP_WORDS_LIMIT = 12;
/** A word needs this many asked outcomes before it can rank as "hard". */
export const MIN_ATTEMPTS_TO_RANK = 2;
export const SPACED_REVIEW_DAYS = [1, 3, 7] as const;

export interface HardWord {
  word: string;
  display: string;
  attempts: number;
  missed: number;
  /** Whole percent. */
  missRate: number;
  studentsMissing: number;
  studentsAsked: number;
}

export interface MasteryTotals {
  students: number;
  words: number;
  sessions: number;
  attempts: number;
  correct: number;
  classAccuracy: number;
}

export interface StudentAccuracy {
  studentId: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface MasteryCell {
  attempts: number;
  correct: number;
}

export interface WordMasteryReport {
  totals: MasteryTotals;
  hardestWords: HardWord[];
  students: StudentAccuracy[];
  heatmap: {
    words: { word: string; display: string }[];
    cells: Record<string, Record<string, MasteryCell>>;
  };
}

export interface WordMasteryPreview {
  totals: MasteryTotals;
  hardestWords: HardWord[];
  /** How many more ranked words the full report holds. */
  hiddenWords: number;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function buildWordMasteryReport(mastery: ClassMastery): WordMasteryReport {
  const byWord = new Map<string, HardWord>();
  const students: StudentAccuracy[] = [];
  const cells: WordMasteryReport['heatmap']['cells'] = {};
  let attempts = 0;
  let correct = 0;

  for (const student of mastery.students) {
    let sAttempts = 0;
    let sCorrect = 0;
    const row: Record<string, MasteryCell> = {};
    for (const w of student.words) {
      sAttempts += w.attempts;
      sCorrect += w.correct;
      row[w.word] = { attempts: w.attempts, correct: w.correct };
      const tally = byWord.get(w.word) ?? {
        word: w.word,
        display: w.display,
        attempts: 0,
        missed: 0,
        missRate: 0,
        studentsMissing: 0,
        studentsAsked: 0,
      };
      tally.attempts += w.attempts;
      tally.missed += w.attempts - w.correct;
      tally.studentsAsked += 1;
      if (w.correct < w.attempts) tally.studentsMissing += 1;
      byWord.set(w.word, tally);
    }
    cells[student.studentId] = row;
    attempts += sAttempts;
    correct += sCorrect;
    students.push({ studentId: student.studentId, attempts: sAttempts, correct: sCorrect, accuracy: pct(sCorrect, sAttempts) });
  }

  const allWords = [...byWord.values()].map((w) => ({ ...w, missRate: pct(w.missed, w.attempts) }));
  const byDifficulty = (a: HardWord, b: HardWord) =>
    b.missed - a.missed || b.missRate - a.missRate || a.word.localeCompare(b.word);

  const hardestWords = allWords
    .filter((w) => w.missed > 0 && w.attempts >= MIN_ATTEMPTS_TO_RANK)
    .sort(byDifficulty)
    .slice(0, HARDEST_WORDS_LIMIT);

  const ranked = new Set(hardestWords.map((w) => w.word));
  const heatmapWords = [
    ...hardestWords,
    ...allWords.filter((w) => !ranked.has(w.word)).sort((a, b) => b.missRate - a.missRate || a.word.localeCompare(b.word)),
  ]
    .slice(0, HEATMAP_WORDS_LIMIT)
    .map(({ word, display }) => ({ word, display }));

  students.sort((a, b) => a.accuracy - b.accuracy || a.studentId.localeCompare(b.studentId));

  return {
    totals: {
      students: mastery.students.length,
      words: byWord.size,
      sessions: mastery.sessionsAnalyzed,
      attempts,
      correct,
      classAccuracy: pct(correct, attempts),
    },
    hardestWords,
    students,
    heatmap: { words: heatmapWords, cells },
  };
}

export function toFreePreview(report: WordMasteryReport): WordMasteryPreview {
  return {
    totals: report.totals,
    hardestWords: report.hardestWords.slice(0, FREE_PREVIEW_WORDS),
    hiddenWords: Math.max(0, report.hardestWords.length - FREE_PREVIEW_WORDS),
  };
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Due days for the spaced rounds, counted from a local YYYY-MM-DD (never server UTC "today"). */
export function buildSpacedReviewDates(today: string): string[] {
  const match = DAY_RE.exec(today);
  if (!match) throw new Error(`Invalid day: ${today}`);
  const base = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (!Number.isFinite(base) || new Date(base).toISOString().slice(0, 10) !== today) {
    throw new Error(`Invalid day: ${today}`);
  }
  return SPACED_REVIEW_DAYS.map((d) => new Date(base + d * 86_400_000).toISOString().slice(0, 10));
}

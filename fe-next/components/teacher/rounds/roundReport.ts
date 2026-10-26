import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { missedThisRound } from '@/lib/education/freeGameHeadline';

const MODE_KEYS: Record<string, string> = {
  classic: 'teacher.lastGame.mode.classic',
  blast: 'teacher.lastGame.mode.blast',
  'word-hunt': 'teacher.lastGame.mode.wordHunt',
  'wheel-rush': 'teacher.lastGame.mode.wheelRush',
  'vocab-quiz': 'teacher.lastGame.mode.vocabQuiz',
  wordcraft: 'teacher.classroom.gameModes.wordcraft',
};

const FALLBACK_TITLE_KEY = 'teacher.classReport.notes.title';

export function roundTitleKey(mode: string): string {
  return MODE_KEYS[mode] ?? FALLBACK_TITLE_KEY;
}

export function activeLineParams({ played, roster }: RecentClassroomGame['participation']) {
  return { active: played, roster: Math.max(played, roster) };
}

export type RoundCellState = 'found' | 'missed';

export interface RoundReportRow {
  studentId: string;
  name: string;
  score: number;
  accuracyPct: number;
  cells: { word: string; state: RoundCellState }[];
}

export interface RoundReport {
  words: string[];
  rows: RoundReportRow[];
  absent: { studentId: string; name: string }[];
  practiceWords: string[];
}

export type AccuracyTone = 'success' | 'warning' | 'danger';

/** 80%+ is on track, 50-79% needs a look, below 50% needs reteaching. */
export function accuracyTone(pct: number): AccuracyTone {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'warning';
  return 'danger';
}

/**
 * Ink for a tone on the navy card, with a darker print variant: the card's
 * light accent colours vanish on white paper, which is how a 0% once printed
 * as pale green.
 */
export const TONE_TEXT: Record<AccuracyTone, string> = {
  success: 'text-neo-lime print:text-green-800',
  warning: 'text-neo-yellow print:text-amber-800',
  danger: 'text-neo-pink print:text-red-700',
};

export type RoundSortKey = 'score' | 'accuracy' | 'name';

export function sortRoundRows(rows: RoundReportRow[], key: RoundSortKey): RoundReportRow[] {
  const byName = (a: RoundReportRow, b: RoundReportRow) => a.name.localeCompare(b.name);
  const compare: Record<RoundSortKey, (a: RoundReportRow, b: RoundReportRow) => number> = {
    score: (a, b) => b.score - a.score || byName(a, b),
    accuracy: (a, b) => a.accuracyPct - b.accuracyPct || byName(a, b),
    name: byName,
  };
  return [...rows].sort(compare[key]);
}

export function buildRoundReport(game: RecentClassroomGame): RoundReport {
  const words = game.missedWords.map((w) => w.word);
  const practiceWords = missedThisRound(game).map((w) => w.word);

  const rows: RoundReportRow[] = game.players.map((p) => {
    const found = new Set(p.lessonWordsFound);
    return {
      studentId: p.studentId,
      name: p.name,
      score: p.score,
      accuracyPct: p.accuracyPct,
      cells: words.map((word) => ({ word, state: found.has(word) ? 'found' : 'missed' })),
    };
  });
  const absent = (game.absentStudents ?? []).map(({ studentId, name }) => ({ studentId, name }));

  return { words, rows, absent, practiceWords };
}

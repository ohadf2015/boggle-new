/**
 * classReport — the pure model behind the teacher's after-game report.
 *
 * `lib/supabase/analyticsLastGame` answers "what happened"; this module turns
 * that into the three things a teacher acts on at the bell:
 *
 *   1. a word x student grid — rows are lesson words worst-first, columns are
 *      students, and every cell says found / missed / did-not-play,
 *   2. a per-word miss trend across the classroom's recent games,
 *   3. one student's missed list plus the drill to assign them.
 *
 * Nothing here fetches, formats a date, or reads a translation. Callers pass
 * their own labels in, so a Hebrew teacher's printout is Hebrew end to end.
 *
 * ── What the data can and cannot say ───────────────────────────────────────
 * The live vocab quiz (`backend/handlers/vocabQuizHandler.ts`) closes through
 * the same persistence path as the board modes: it hands `correctWords` to
 * `persistClassroomGameScores`, which splits the lesson's FULL word list into
 * found / missed. Its per-question answer map is in-memory and dies with the
 * round. Two consequences we surface rather than hide:
 *
 *   • For a quiz, "missed" means "not answered correctly" — a wrong answer and
 *     an unanswered question are indistinguishable in the database.
 *   • A quiz asks a fixed number of questions from a lesson that may hold many
 *     more words, and every unasked word lands in every student's missed list.
 *     So a quiz report's worst rows may be words the class never saw, which is
 *     why `mayIncludeUnaskedWords` exists and the UI must print the caveat.
 *
 * Persisting the asked-word set alongside `correctWords` would fix both.
 */

import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { normalizeForStorage } from '@/lib/supabase/education/types';

// ============================================
// TYPES
// ============================================

/** What one student did with one word. Never encoded by colour alone. */
export type CellState = 'found' | 'missed' | 'absent';

/**
 * The glyph carried alongside each cell's colour, so the grid survives
 * colour-blindness, a greyscale printout, and a screen reader.
 */
export const CELL_SYMBOL: Record<CellState, string> = {
  found: '✓',
  missed: '✕',
  absent: '·',
};

export interface ReportColumn {
  studentId: string;
  name: string;
  /** False for a roster student with no session row in this game. */
  played: boolean;
  score: number;
  foundCount: number;
  missedCount: number;
  /** found / lesson words, as a rounded percentage. 0 for an absentee. */
  accuracyPct: number;
}

export interface ReportRow {
  word: string;
  /** Normalized match key — Hebrew finals collapsed, case folded. */
  key: string;
  /** One entry per column, in column order. */
  cells: CellState[];
  missedBy: number;
  /** Students who actually played. Absentees are never counted here. */
  attempted: number;
  missPct: number;
}

export interface ClassReportGrid {
  rows: ReportRow[];
  columns: ReportColumn[];
  gameMode: string;
  /** 'quiz' swaps found/missed wording for answered-correctly/not. */
  stateLabelKind: 'board' | 'quiz';
  /** True when unfound words may simply never have been asked. See header. */
  mayIncludeUnaskedWords: boolean;
  symbolFor: (state: CellState) => string;
}

export interface TrendPoint {
  gameCode: string;
  playedAt: string;
  missPct: number;
}

export interface WordTrend {
  word: string;
  key: string;
  /** Oldest game first, so a sparkline reads left to right. */
  points: TrendPoint[];
  /** Last miss % minus first. Negative means the class improved. */
  delta: number;
}

/** What to drill with a student, or why not to drill at all. */
export type PracticeKey = 'flashcard' | 'spelling' | 'none' | 'absent';

export interface StudentDrillDown {
  studentId: string;
  name: string;
  played: boolean;
  accuracyPct: number;
  foundCount: number;
  /** Worst-first, matching the grid's row order. */
  missedWords: string[];
  practiceKey: PracticeKey;
}

/** Every human-readable string `buildNotesText` may emit. */
export interface ClassReportLabels {
  title: string;
  playedAt: string;
  reteach: string;
  checkIn: string;
  absent: string;
  nobodyFound: string;
  allFound: string;
  everyoneOk: string;
  quizCaveat: string;
  missedBy: string;
  /** Optional pre-formatted replacements for the raw game fields. */
  modeLabel?: string;
  playedAtText?: string;
}

// ============================================
// CONSTANTS
// ============================================

/** Live quiz rounds carry this mode through `practice_sessions.results`. */
const QUIZ_MODE = 'vocab-quiz';

/** At or above this share of the list missed, meaning comes before spelling. */
const MEANING_FIRST_MISS_PCT = 50;

/** Below this accuracy a student goes on the "check in with" list. */
const CHECK_IN_ACCURACY_PCT = 50;

const pct = (num: number, den: number): number => (den > 0 ? Math.round((num / den) * 100) : 0);

// ============================================
// GRID
// ============================================

/**
 * Fold one game into the word x student grid.
 *
 * Rows come from `missedWords`, which analyticsLastGame already built as the
 * union of every player's found and missed lists — that IS the lesson's word
 * set for this game. Columns are the players who have a session row, then the
 * roster students who do not.
 */
export function buildClassReportGrid(game: RecentClassroomGame): ClassReportGrid {
  const columns: ReportColumn[] = [];
  const foundKeysByStudent = new Map<string, Set<string>>();

  for (const player of game.players) {
    foundKeysByStudent.set(
      player.studentId,
      new Set(player.lessonWordsFound.map((w) => normalizeForStorage(w)))
    );
    columns.push({
      studentId: player.studentId,
      name: player.name,
      played: true,
      score: player.score,
      foundCount: 0,
      missedCount: 0,
      accuracyPct: 0,
    });
  }

  for (const absent of game.absentStudents ?? []) {
    columns.push({
      studentId: absent.studentId,
      name: absent.name,
      played: false,
      score: 0,
      foundCount: 0,
      missedCount: 0,
      accuracyPct: 0,
    });
  }

  const attempted = columns.filter((c) => c.played).length;

  const rows: ReportRow[] = game.missedWords.map((entry) => {
    const key = normalizeForStorage(entry.word);
    const cells: CellState[] = columns.map((col) => {
      if (!col.played) return 'absent';
      return foundKeysByStudent.get(col.studentId)?.has(key) ? 'found' : 'missed';
    });

    cells.forEach((cell, i) => {
      if (cell === 'found') columns[i].foundCount += 1;
      else if (cell === 'missed') columns[i].missedCount += 1;
    });

    const missedBy = cells.filter((c) => c === 'missed').length;
    return { word: entry.word, key, cells, missedBy, attempted, missPct: pct(missedBy, attempted) };
  });

  rows.sort((a, b) => b.missPct - a.missPct || a.word.localeCompare(b.word));
  // Re-order the cells to match the sorted rows is unnecessary: cells are keyed
  // to columns, and sorting rows never reorders columns.

  for (const col of columns) {
    col.accuracyPct = pct(col.foundCount, col.foundCount + col.missedCount);
  }

  const isQuiz = game.gameMode === QUIZ_MODE;

  return {
    rows,
    columns,
    gameMode: game.gameMode,
    stateLabelKind: isQuiz ? 'quiz' : 'board',
    mayIncludeUnaskedWords: isQuiz,
    symbolFor: (state: CellState) => CELL_SYMBOL[state],
  };
}

// ============================================
// TRENDS
// ============================================

/**
 * Miss % per word across the classroom's recent games.
 *
 * Games arrive newest-first and may cover different lessons, so points are
 * re-sorted oldest-first and a word is only charted where at least two games
 * contain it. Series are keyed on the normalized word: a lesson edited between
 * games can change a word's display form without changing the word.
 */
export function buildWordTrends(games: RecentClassroomGame[]): WordTrend[] {
  if (games.length < 2) return [];

  const chronological = [...games].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const series = new Map<string, { word: string; points: TrendPoint[] }>();

  for (const game of chronological) {
    for (const entry of game.missedWords) {
      const key = normalizeForStorage(entry.word);
      const existing = series.get(key);
      const point: TrendPoint = {
        gameCode: game.gameCode,
        playedAt: game.playedAt,
        missPct: entry.pct,
      };
      if (existing) {
        existing.points.push(point);
        // Keep the newest game's spelling — that is the lesson as it stands.
        existing.word = entry.word;
      } else {
        series.set(key, { word: entry.word, points: [point] });
      }
    }
  }

  const trends: WordTrend[] = [];
  for (const [key, { word, points }] of series) {
    if (points.length < 2) continue;
    trends.push({
      word,
      key,
      points,
      delta: points[points.length - 1].missPct - points[0].missPct,
    });
  }

  trends.sort((a, b) => {
    const latest = b.points[b.points.length - 1].missPct - a.points[a.points.length - 1].missPct;
    return latest || a.word.localeCompare(b.word);
  });
  return trends;
}

// ============================================
// DRILL-DOWN
// ============================================

/**
 * One student's column, read back as an instructional next step.
 *
 * The suggestion is deliberately coarse: `buildPracticeTiles` needs the
 * lesson's `VocabularyWord[]` with definitions, which the report never loads,
 * so guessing a specific drill from word strings alone would be dishonest.
 * Missing most of the list points at meaning, missing a few points at form.
 */
export function studentDrillDown(
  grid: ClassReportGrid,
  studentId: string
): StudentDrillDown | null {
  const index = grid.columns.findIndex((c) => c.studentId === studentId);
  if (index === -1) return null;
  const col = grid.columns[index];

  if (!col.played) {
    return {
      studentId: col.studentId,
      name: col.name,
      played: false,
      accuracyPct: 0,
      foundCount: 0,
      missedWords: [],
      practiceKey: 'absent',
    };
  }

  const missedWords = grid.rows.filter((r) => r.cells[index] === 'missed').map((r) => r.word);
  const total = col.foundCount + col.missedCount;
  const missPct = pct(col.missedCount, total);

  let practiceKey: PracticeKey = 'none';
  if (missedWords.length > 0) {
    practiceKey = missPct >= MEANING_FIRST_MISS_PCT ? 'flashcard' : 'spelling';
  }

  return {
    studentId: col.studentId,
    name: col.name,
    played: true,
    accuracyPct: col.accuracyPct,
    foundCount: col.foundCount,
    missedWords,
    practiceKey,
  };
}

// ============================================
// COPY FOR MY NOTES
// ============================================

/**
 * A plain-text summary a teacher can paste into lesson notes.
 *
 * Every word of prose comes from `labels`, so the output is in whatever
 * language the caller resolved. Only the game's own data — student names,
 * lesson words, the mode and timestamp — is emitted verbatim.
 */
export function buildNotesText(
  game: RecentClassroomGame,
  grid: ClassReportGrid,
  labels: ClassReportLabels
): string {
  const lines: string[] = [];
  const mode = labels.modeLabel ?? game.gameMode;
  const when = labels.playedAtText ?? game.playedAt;

  lines.push(`${labels.title} — ${mode} · ${when}`);
  lines.push(`${labels.playedAt}: ${game.participation.played}/${game.participation.roster}`);
  if (grid.mayIncludeUnaskedWords) lines.push(labels.quizCaveat);
  lines.push('');

  // ---- Words to reteach, worst first ----
  lines.push(labels.reteach);
  const reteach = grid.rows.filter((r) => r.missedBy > 0);
  if (reteach.length === 0) {
    lines.push(`  ${labels.allFound}`);
  } else {
    for (const row of reteach) {
      const nobody = row.missPct === 100 ? ` · ${labels.nobodyFound}` : '';
      lines.push(
        `  ${row.word} — ${labels.missedBy} ${row.missedBy}/${row.attempted} (${row.missPct}%)${nobody}`
      );
    }
  }
  lines.push('');

  // ---- Students below the line ----
  lines.push(labels.checkIn);
  const behind = grid.columns.filter((c) => c.played && c.accuracyPct < CHECK_IN_ACCURACY_PCT);
  if (behind.length === 0) {
    lines.push(`  ${labels.everyoneOk}`);
  } else {
    for (const col of behind) {
      const drill = studentDrillDown(grid, col.studentId);
      const words = drill?.missedWords.length ? ` (${drill.missedWords.join(', ')})` : '';
      lines.push(`  ${col.name} — ${col.accuracyPct}%${words}`);
    }
  }

  // ---- Absentees ----
  const absent = grid.columns.filter((c) => !c.played);
  if (absent.length > 0) {
    lines.push('');
    lines.push(labels.absent);
    for (const col of absent) lines.push(`  ${col.name}`);
  }

  return lines.join('\n');
}

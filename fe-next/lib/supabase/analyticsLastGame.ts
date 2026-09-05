/**
 * Last-class-game analytics
 *
 * Reads the per-student `practice_sessions` rows the backend writes when a
 * live classroom game ends (`backend/handlers/classroomGamePersistence.ts`)
 * and folds them into one insight object per game: who played, which lesson
 * words the class missed, coverage, and a per-student found/missed split.
 *
 * This is the FREE "Last class game" card — it deliberately reads only
 * `practice_sessions` (plus roster names) so it works even when the deeper
 * `student_lesson_progress` analytics are gated behind Pro.
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { resolveDisplayName } from '@/lib/displayName';
import { normalizeForStorage } from '@/lib/supabase/education/types';

export interface LastGamePlayer {
  studentId: string;
  /** Roster display name — never a raw id or `Player_xxx` placeholder. */
  name: string;
  score: number;
  lessonWordsFound: string[];
  lessonWordsMissed: string[];
  /** found / (found + missed) as a rounded percentage; 0 when no lesson words. */
  accuracyPct: number;
}

export interface LastGameMissedWord {
  word: string;
  missedBy: number;
  total: number;
  pct: number;
}

/**
 * A roster student who has no session row for this game.
 *
 * "Missed the word" and "was not in the room" are different instructional
 * facts, and the word x student grid needs both. Absentees are additive:
 * they never enter the miss rates, the average accuracy, or
 * `participation.played`, all of which describe the students who played.
 */
export interface AbsentStudent {
  studentId: string;
  name: string;
}

export interface RecentClassroomGame {
  gameCode: string;
  gameMode: string;
  /** ISO timestamp of the newest session row in the game. */
  playedAt: string;
  lessonIds: string[];
  /** Sorted by score, highest first. */
  players: LastGamePlayer[];
  /** Every lesson word, sorted by miss-rate (highest first). */
  missedWords: LastGameMissedWord[];
  totalLessonWords: number;
  wordsNobodyFound: string[];
  /** Share of lesson words found by at least one student. */
  coveragePct: number;
  /** Mean of the players' `accuracyPct`. */
  averageAccuracyPct: number;
  participation: { played: number; roster: number };
  /**
   * Roster students with no session row for this game. Always set by
   * `getRecentClassroomGames` (empty when the roster query failed); optional
   * so existing fixtures and callers keep compiling.
   */
  absentStudents?: AbsentStudent[];
}

export interface GetRecentClassroomGamesOptions {
  /** Label used for students with no usable name: "<fallbackName> 1", "<fallbackName> 2", … */
  fallbackName?: string;
}

interface SessionRow {
  student_id: string;
  score: number | null;
  total_score: number | null;
  mode: string | null;
  completed_at: string | null;
  results: {
    gameCode?: string;
    gameMode?: string;
    lessonIds?: string[];
    lessonWordsFound?: string[];
    lessonWordsMissed?: string[];
  } | null;
}

/** Rows per game we are willing to scan; a class is never larger than this. */
const MAX_ROWS_PER_GAME = 60;

/** One `classroom_memberships` row, reduced to what the report needs. */
interface RosterMember {
  studentId: string;
  /** ISO enrollment date. Null on legacy rows, where the column is nullable. */
  joinedAt: string | null;
}

const pct = (num: number, den: number): number => (den > 0 ? Math.round((num / den) * 100) : 0);

function buildGame(
  gameCode: string,
  rows: SessionRow[],
  names: Map<string, string>,
  roster: number | null,
  rosterMembers: RosterMember[]
): RecentClassroomGame {
  const players: LastGamePlayer[] = rows.map((row) => {
    const found = row.results?.lessonWordsFound ?? [];
    const missed = row.results?.lessonWordsMissed ?? [];
    return {
      studentId: row.student_id,
      name: names.get(row.student_id) ?? '',
      score: row.score ?? row.total_score ?? 0,
      lessonWordsFound: found,
      lessonWordsMissed: missed,
      accuracyPct: pct(found.length, found.length + missed.length),
    };
  });
  players.sort((a, b) => b.score - a.score);

  // Lesson words = union of found ∪ missed across players, deduped on the
  // same normalization the backend used (case, Hebrew finals).
  const display = new Map<string, string>();
  const missedBy = new Map<string, number>();
  for (const p of players) {
    for (const w of p.lessonWordsFound) {
      const k = normalizeForStorage(w);
      if (!display.has(k)) display.set(k, w);
    }
    for (const w of p.lessonWordsMissed) {
      const k = normalizeForStorage(w);
      if (!display.has(k)) display.set(k, w);
      missedBy.set(k, (missedBy.get(k) ?? 0) + 1);
    }
  }

  const total = players.length;
  const missedWords: LastGameMissedWord[] = [...display.entries()]
    .map(([k, word]) => {
      const n = missedBy.get(k) ?? 0;
      return { word, missedBy: n, total, pct: pct(n, total) };
    })
    .sort((a, b) => b.pct - a.pct || a.word.localeCompare(b.word));

  const wordsNobodyFound = missedWords.filter((w) => w.missedBy === total && total > 0).map((w) => w.word);
  const rated = players.filter((p) => p.lessonWordsFound.length + p.lessonWordsMissed.length > 0);
  const averageAccuracyPct = rated.length
    ? Math.round(rated.reduce((sum, p) => sum + p.accuracyPct, 0) / rated.length)
    : 0;

  const played = new Set(rows.map((r) => r.student_id));

  const newest = rows.reduce<string>(
    (acc, r) => (r.completed_at && r.completed_at > acc ? r.completed_at : acc),
    rows[0]?.completed_at ?? ''
  );

  return {
    gameCode,
    gameMode: rows[0]?.results?.gameMode ?? rows[0]?.mode ?? 'classic',
    playedAt: newest,
    lessonIds: rows[0]?.results?.lessonIds ?? [],
    players,
    missedWords,
    totalLessonWords: display.size,
    wordsNobodyFound,
    coveragePct: pct(display.size - wordsNobodyFound.length, display.size),
    averageAccuracyPct,
    participation: { played: total, roster: roster ?? total },
    // Only students who were already on the roster when this game was played.
    // A student who enrolled on Thursday must not show as "did not play" on
    // Monday's game — that is the confusion this third state exists to end.
    // A null `joined_at` is a legacy row, read as a long-standing member.
    absentStudents: rosterMembers
      .filter(
        (m) =>
          !played.has(m.studentId) && (!m.joinedAt || !newest || m.joinedAt <= newest)
      )
      .map((m) => ({ studentId: m.studentId, name: names.get(m.studentId) ?? '' })),
  };
}

/**
 * The most recent live games of a classroom, newest first.
 * Errors on the primary query are returned; roster/name lookups degrade
 * gracefully (numbered fallback names, roster = players) but are logged.
 */
export async function getRecentClassroomGames(
  classroomId: string,
  limit: number = 5,
  options: GetRecentClassroomGamesOptions = {}
): Promise<{ data: RecentClassroomGame[]; error: { message: string } | null }> {
  if (!supabase) {
    return { data: [], error: { message: 'Supabase not configured' } };
  }
  const fallbackName = options.fallbackName ?? 'Student';

  try {
    const { data: rows, error } = await supabase
      .from('practice_sessions')
      .select('student_id, score, total_score, mode, completed_at, results')
      .eq('classroom_id', classroomId)
      .not('results->>gameCode', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(Math.max(1, limit) * MAX_ROWS_PER_GAME);

    if (error) {
      logger.error('Error fetching classroom game sessions:', error);
      return { data: [], error: { message: error.message } };
    }

    const sessions = (rows ?? []) as SessionRow[];
    if (sessions.length === 0) return { data: [], error: null };

    // Group by game, preserving newest-first order; cap at `limit` games.
    const byGame = new Map<string, SessionRow[]>();
    for (const row of sessions) {
      const code = row.results?.gameCode;
      if (!code) continue;
      if (!byGame.has(code)) {
        if (byGame.size >= limit) continue;
        byGame.set(code, []);
      }
      byGame.get(code)!.push(row);
    }

    const playedIds = [...new Set([...byGame.values()].flat().map((r) => r.student_id))];

    // The roster comes back as rows AND a count from one query — the rows give
    // the grid its "did not play" column, the count keeps participation honest.
    // It runs before the profile lookup so absentees get real names too; a
    // roster failure degrades to "no absentees", never to a broken card.
    const rosterResult = await supabase
      .from('classroom_memberships')
      .select('student_id, joined_at', { count: 'exact' })
      .eq('classroom_id', classroomId);

    if (rosterResult.error) {
      logger.error('Error counting classroom roster:', rosterResult.error);
    }
    const roster = rosterResult.error ? null : (rosterResult.count ?? null);

    const seenMembers = new Set<string>();
    const rosterMembers: RosterMember[] = rosterResult.error
      ? []
      : ((rosterResult.data ?? []) as Array<{ student_id?: string | null; joined_at?: string | null }>)
          .filter((r) => {
            const id = r.student_id;
            if (typeof id !== 'string' || id === '' || seenMembers.has(id)) return false;
            seenMembers.add(id);
            return true;
          })
          .map((r) => ({ studentId: r.student_id as string, joinedAt: r.joined_at ?? null }));

    // Players first, then absentees — so the numbered fallback labels a player
    // sees never shift when the roster query starts or stops returning rows.
    const studentIds = [
      ...playedIds,
      ...rosterMembers.map((m) => m.studentId).filter((id) => !playedIds.includes(id)),
    ];

    const profilesResult = await supabase
      .from('public_profiles')
      .select('id, display_name, username')
      .in('id', studentIds);

    if (profilesResult.error) {
      logger.error('Error fetching student profiles:', profilesResult.error);
    }

    const profiles = new Map<string, { display_name?: string | null; username?: string | null }>();
    for (const p of (profilesResult.data ?? []) as Array<{ id: string; display_name?: string | null; username?: string | null }>) {
      profiles.set(p.id, p);
    }
    // Stable numbering for unnamed students across all games in this call.
    const names = new Map<string, string>();
    let unnamed = 0;
    for (const id of studentIds) {
      const p = profiles.get(id);
      const resolved = resolveDisplayName([p?.display_name, p?.username], '');
      names.set(id, resolved || `${fallbackName} ${++unnamed}`);
    }

    const games = [...byGame.entries()].map(([code, gameRows]) =>
      buildGame(code, gameRows, names, roster, rosterMembers)
    );
    return { data: games, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getRecentClassroomGames:', message);
    return { data: [], error: { message } };
  }
}

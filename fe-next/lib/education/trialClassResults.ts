/**
 * The teacher's own class results for the trial-ending emails: what their class actually
 * did, so the $9/mo ask sits next to the reason to pay. Aggregates only; no student names.
 *
 * Source: completed live class rounds with 2+ real players (`classroom_rounds`), the
 * non-rehearsal roster of the teacher's classes (`classroom_memberships`), and the
 * students' per-game rows for those rounds (`game_sessions.room_code` = round game code).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { REAL_CLASS_MIN_PLAYERS } from './teacherUsagePrompt';

export interface TrialClassResults {
  /** Distinct live class games (classroom + game code). */
  gamesRun: number;
  /** Students on the teacher's class rosters (rehearsal seats excluded). */
  students: number;
  /** Words found across those games, all students. */
  wordsFound: number;
  /** Best single-student score in a class game, or null. */
  topScore: number | null;
  /** Longest word any student found, upper-cased, or null. */
  longestWord: string | null;
}

export interface RoundRow { teacher_id: string; classroom_id: string | null; game_code: string | null }
export interface ClassroomRow { id: string; teacher_id: string }
export interface MembershipRow { classroom_id: string; student_id: string; is_rehearsal?: boolean | null }
export interface SessionRow { room_code: string | null; score: number | null; words_found: unknown }

const WORD_MAX = 24;

function wordsOf(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const w of raw) {
    const word = typeof w === 'string' ? w : w && typeof w === 'object' ? (w as { word?: unknown }).word : null;
    if (typeof word === 'string' && word.trim()) out.push(word.trim());
  }
  return out;
}

/** Pure: one teacher's results from already-loaded rows. */
export function summarizeTrialClassResults(
  teacherId: string,
  rows: { rounds: readonly RoundRow[]; classrooms: readonly ClassroomRow[]; memberships: readonly MembershipRow[]; sessions: readonly SessionRow[] },
): TrialClassResults {
  const games = new Set<string>();
  const codes = new Set<string>();
  for (const r of rows.rounds) {
    if (r.teacher_id !== teacherId || !r.game_code) continue;
    games.add(`${r.classroom_id ?? ''}:${r.game_code}`);
    codes.add(r.game_code);
  }
  const classIds = new Set(rows.classrooms.filter((c) => c.teacher_id === teacherId).map((c) => c.id));
  const students = new Set(
    rows.memberships.filter((m) => classIds.has(m.classroom_id) && m.is_rehearsal !== true).map((m) => m.student_id),
  );
  let wordsFound = 0;
  let topScore: number | null = null;
  let longestWord: string | null = null;
  for (const s of rows.sessions) {
    if (!s.room_code || !codes.has(s.room_code)) continue;
    const words = wordsOf(s.words_found);
    wordsFound += words.length;
    if (typeof s.score === 'number' && Number.isFinite(s.score) && (topScore === null || s.score > topScore)) topScore = s.score;
    for (const w of words) {
      if (w.length > WORD_MAX) continue;
      if (!longestWord || [...w].length > [...longestWord].length) longestWord = w;
    }
  }
  return {
    gamesRun: games.size,
    students: students.size,
    wordsFound,
    topScore,
    longestWord: longestWord ? longestWord.toLocaleUpperCase() : null,
  };
}

/**
 * Results for each teacher id. Best effort: a failed read returns an empty map, and the
 * email goes out without the results block rather than not at all.
 */
export async function loadTrialClassResults(
  db: Pick<SupabaseClient, 'from'>,
  teacherIds: readonly string[],
): Promise<Map<string, TrialClassResults>> {
  const out = new Map<string, TrialClassResults>();
  const ids = [...new Set(teacherIds.filter(Boolean))];
  if (ids.length === 0) return out;
  try {
    const { data: roundData, error: roundError } = await db
      .from('classroom_rounds')
      .select('teacher_id, classroom_id, game_code')
      .in('teacher_id', ids)
      .gte('player_count', REAL_CLASS_MIN_PLAYERS);
    if (roundError) throw new Error(roundError.message);
    const rounds = (roundData ?? []) as RoundRow[];

    const { data: classData, error: classError } = await db.from('classrooms').select('id, teacher_id').in('teacher_id', ids);
    if (classError) throw new Error(classError.message);
    const classrooms = (classData ?? []) as ClassroomRow[];

    let memberships: MembershipRow[] = [];
    const classIds = classrooms.map((c) => c.id);
    if (classIds.length > 0) {
      const { data, error } = await db
        .from('classroom_memberships')
        .select('classroom_id, student_id, is_rehearsal')
        .in('classroom_id', classIds);
      if (error) throw new Error(error.message);
      memberships = (data ?? []) as MembershipRow[];
    }

    let sessions: SessionRow[] = [];
    const codes = [...new Set(rounds.map((r) => r.game_code).filter((c): c is string => Boolean(c)))];
    if (codes.length > 0) {
      const { data, error } = await db.from('game_sessions').select('room_code, score, words_found').in('room_code', codes);
      if (error) throw new Error(error.message);
      sessions = (data ?? []) as SessionRow[];
    }

    for (const id of ids) out.set(id, summarizeTrialClassResults(id, { rounds, classrooms, memberships, sessions }));
  } catch {
    return new Map();
  }
  return out;
}

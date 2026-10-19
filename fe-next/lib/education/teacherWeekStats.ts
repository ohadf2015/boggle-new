// Teacher Home's "This week": one indexed read of live-game rows, summarised client-side.

import type { SupabaseClient } from '@supabase/supabase-js';

export const TEACHER_ACTIVITY_WINDOW_DAYS = 30;
const WEEK_DAYS = 7;
const DAY_MS = 86_400_000;
/** Rows are one per student per game; newest first, so the week is never the part cut off. */
const ROW_CAP = 3000;
/** Fail open: a slow read shows "—", it never holds the home screen. */
export const TEACHER_ACTIVITY_TIMEOUT_MS = 6000;

export interface TeacherActivityRow {
  classroom_id: string;
  completed_at: string;
  game_code: string | null;
}

export interface TeacherWeekSummary {
  gamesPlayed: number;
  /** Distinct games in the whole activity window; the trial recap's "what you ran". */
  gamesLast30d: number;
  totalStudents: number;
  activeClasses: number;
  /** Most recent live game per class within the activity window. */
  lastPlayedAt: Record<string, string>;
}

export function summarizeTeacherWeek(
  rows: readonly TeacherActivityRow[],
  classrooms: readonly { id: string; member_count?: number | null }[],
  nowMs: number,
): TeacherWeekSummary {
  const weekStart = nowMs - WEEK_DAYS * DAY_MS;
  const games = new Set<string>();
  const allGames = new Set<string>();
  const active = new Set<string>();
  const lastPlayedAt: Record<string, string> = {};
  for (const row of rows) {
    if (!row.game_code) continue;
    allGames.add(`${row.classroom_id}:${row.game_code}`);
    const prev = lastPlayedAt[row.classroom_id];
    if (!prev || row.completed_at > prev) lastPlayedAt[row.classroom_id] = row.completed_at;
    if (Date.parse(row.completed_at) >= weekStart) {
      games.add(`${row.classroom_id}:${row.game_code}`);
      active.add(row.classroom_id);
    }
  }
  return {
    gamesPlayed: games.size,
    gamesLast30d: allGames.size,
    totalStudents: classrooms.reduce((n, c) => n + (c.member_count ?? 0), 0),
    activeClasses: active.size,
    lastPlayedAt,
  };
}

export async function fetchTeacherActivityRows(
  db: SupabaseClient,
  classroomIds: readonly string[],
  nowMs: number,
): Promise<TeacherActivityRow[]> {
  if (classroomIds.length === 0) return [];
  const since = new Date(nowMs - TEACHER_ACTIVITY_WINDOW_DAYS * DAY_MS).toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEACHER_ACTIVITY_TIMEOUT_MS);
  try {
    const { data, error } = await db
      .from('practice_sessions')
      .select('classroom_id, completed_at, game_code:results->>gameCode')
      .in('classroom_id', [...classroomIds])
      .gte('completed_at', since)
      .not('results->>gameCode', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(ROW_CAP)
      .abortSignal(controller.signal);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TeacherActivityRow[];
  } finally {
    clearTimeout(timer);
  }
}

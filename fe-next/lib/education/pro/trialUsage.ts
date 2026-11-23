import type { SupabaseClient } from '@supabase/supabase-js';
import { TEACHER_PRO_TRIAL_DAYS } from './trialDays';

export interface TrialUsage {
  games: number;
  students: number;
  practice: number;
}

export type TrialUsageDb = Pick<SupabaseClient, 'from'>;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_WINDOW_DAYS = 31;
const ROSTER_CAP = 5000;

export function trialStartFromExpiry(expiresIso: string | null | undefined): string | null {
  const end = expiresIso ? Date.parse(expiresIso) : NaN;
  return Number.isFinite(end) ? new Date(end - TEACHER_PRO_TRIAL_DAYS * DAY_MS).toISOString() : null;
}

export function clampTrialSince(raw: string | null | undefined, now: number = Date.now()): string | null {
  const at = raw ? Date.parse(raw) : NaN;
  if (!Number.isFinite(at) || at > now) return null;
  return new Date(Math.max(at, now - MAX_WINDOW_DAYS * DAY_MS)).toISOString();
}

function fail(error: unknown): never {
  throw error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error));
}

/** What a teacher ran since `sinceIso`; throws on any read error so a failure never reads as zero. */
export async function readTrialUsage(db: TrialUsageDb, teacherId: string, sinceIso: string): Promise<TrialUsage> {
  const classes = await db.from('classrooms').select('id').eq('teacher_id', teacherId);
  if (classes.error) fail(classes.error);
  const ids = ((classes.data ?? []) as Array<{ id: string }>).map((c) => c.id);
  const untilIso = new Date(Date.parse(sinceIso) + TEACHER_PRO_TRIAL_DAYS * DAY_MS).toISOString();

  const rounds = db
    .from('classroom_rounds')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)
    .gte('completed_at', sinceIso)
    .lt('completed_at', untilIso);
  if (ids.length === 0) {
    const r = await rounds;
    if (r.error) fail(r.error);
    return { games: r.count ?? 0, students: 0, practice: 0 };
  }

  const [r, members, practice] = await Promise.all([
    rounds,
    db.from('classroom_memberships').select('student_id').in('classroom_id', ids).limit(ROSTER_CAP),
    db
      .from('practice_sessions')
      .select('id', { count: 'exact', head: true })
      .in('classroom_id', ids)
      .gte('completed_at', sinceIso)
      .lt('completed_at', untilIso)
      // Live-game seats are practice_sessions rows too; they are already counted as games.
      .is('results->>gameCode', null),
  ]);
  if (r.error) fail(r.error);
  if (members.error) fail(members.error);
  if (practice.error) fail(practice.error);

  const students = new Set(
    ((members.data ?? []) as Array<{ student_id: string | null }>).map((m) => m.student_id).filter(Boolean),
  );
  return { games: r.count ?? 0, students: students.size, practice: practice.count ?? 0 };
}

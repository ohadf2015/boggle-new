/**
 * Load 30 days of classroom sessions + roster so the dashboard can derive
 * both 7d and 30d windows without a second round trip.
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { resolveDisplayName } from '@/lib/displayName';
import { windowStartIso, type WindowRosterStudent, type WindowSession } from '@/lib/education/windowedClassroomProgress';

export interface ClassroomWindowSource {
  roster: WindowRosterStudent[];
  sessions: WindowSession[];
}

interface SessionRow {
  student_id: string;
  completed_at: string | null;
  results: {
    lessonWordsFound?: string[];
    lessonWordsMissed?: string[];
  } | null;
}

export async function getClassroomWindowSource(
  classroomId: string,
  now: number = Date.now(),
  client?: typeof supabase,
): Promise<{ data: ClassroomWindowSource | null; error: { message: string } | null }> {
  const db = client ?? supabase;
  if (!db) return { data: null, error: { message: 'Supabase not configured' } };
  if (!classroomId) return { data: { roster: [], sessions: [] }, error: null };

  try {
    const since = windowStartIso(30, now);
    const [rosterResult, sessionResult] = await Promise.all([
      db.from('classroom_memberships').select('student_id').eq('classroom_id', classroomId),
      db
        .from('practice_sessions')
        .select('student_id, completed_at, results')
        .eq('classroom_id', classroomId)
        .gte('completed_at', since)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(2000),
    ]);

    if (rosterResult.error) {
      logger.error('Error fetching classroom roster for window progress:', rosterResult.error);
      return { data: null, error: { message: rosterResult.error.message } };
    }
    if (sessionResult.error) {
      logger.error('Error fetching classroom sessions for window progress:', sessionResult.error);
      return { data: null, error: { message: sessionResult.error.message } };
    }

    const seen = new Set<string>();
    const studentIds: string[] = [];
    for (const row of (rosterResult.data ?? []) as Array<{ student_id?: string | null }>) {
      const id = row.student_id;
      if (typeof id !== 'string' || id === '' || seen.has(id)) continue;
      seen.add(id);
      studentIds.push(id);
    }

    const profilesResult =
      studentIds.length > 0
        ? await db.from('public_profiles').select('id, display_name, username').in('id', studentIds)
        : { data: [], error: null };
    if (profilesResult.error) {
      logger.error('Error fetching student profiles for window progress:', profilesResult.error);
    }
    const profiles = new Map<string, { display_name?: string | null; username?: string | null }>();
    for (const p of (profilesResult.data ?? []) as Array<{
      id: string;
      display_name?: string | null;
      username?: string | null;
    }>) {
      profiles.set(p.id, p);
    }

    let unnamed = 0;
    const roster: WindowRosterStudent[] = studentIds.map((id) => {
      const p = profiles.get(id);
      const resolved = resolveDisplayName([p?.display_name, p?.username], '');
      return { studentId: id, name: resolved || `Student ${++unnamed}` };
    });

    const sessions: WindowSession[] = ((sessionResult.data ?? []) as SessionRow[])
      .filter((row) => typeof row.student_id === 'string' && row.completed_at)
      .map((row) => {
        const found = row.results?.lessonWordsFound ?? [];
        const missed = row.results?.lessonWordsMissed ?? [];
        return {
          studentId: row.student_id,
          completedAt: row.completed_at as string,
          foundCount: found.length,
          missedCount: missed.length,
        };
      });

    return { data: { roster, sessions }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassroomWindowSource:', message);
    return { data: null, error: { message } };
  }
}

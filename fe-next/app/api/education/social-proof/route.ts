import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';
import { summarizeTeacherProof, teacherProofToShow, type ProofSessionRow } from '@/lib/education/teacherProof';

/**
 * GET /api/education/social-proof — { show: false } or { show: true, teachers, games }.
 * Real live-game counts for the last 30 days, test accounts excluded, public and cached for an
 * hour. The read is capped (rows + time) and fails closed: no number is ever better than a wrong one.
 */
const WINDOW_DAYS = 30;
const ROW_CAP = 5000;
const READ_TIMEOUT_MS = 6000;
const CACHE_MS = 60 * 60 * 1000;
const NONE = { show: false } as const;

let cache: { at: number; body: Record<string, unknown> } | null = null;
export function __resetTeacherProofCache() {
  cache = null;
}

async function readProof(): Promise<Record<string, unknown>> {
  const admin = createAdminClient();
  if (!admin) return { ...NONE };
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
  try {
    const { data: rows, error } = await admin
      .from('practice_sessions')
      .select('classroom_id, game_code:results->>gameCode')
      .gte('completed_at', since)
      .not('results->>gameCode', 'is', null)
      .limit(ROW_CAP)
      .abortSignal(controller.signal);
    if (error || !rows) return { ...NONE };
    const sessions = rows as unknown as ProofSessionRow[];

    const classroomIds = [...new Set(sessions.map((r) => r.classroom_id))];
    if (classroomIds.length === 0) return { ...NONE };
    const { data: owners } = await admin.from('classrooms').select('id, teacher_id').in('id', classroomIds);
    const teacherOfClassroom: Record<string, string> = {};
    for (const o of (owners ?? []) as Array<{ id: string; teacher_id: string }>) teacherOfClassroom[o.id] = o.teacher_id;

    const teacherIds = [...new Set(Object.values(teacherOfClassroom))];
    const { data: tests } = await admin.from('profiles').select('id').in('id', teacherIds).eq('is_test_account', true);
    const testTeachers = new Set(((tests ?? []) as Array<{ id: string }>).map((p) => p.id));

    const shown = teacherProofToShow(summarizeTeacherProof(sessions, teacherOfClassroom, testTeachers));
    return shown ? { show: true, ...shown } : { ...NONE };
  } catch (err) {
    logger.warn('[social-proof] read failed', err);
    return { ...NONE };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    cache = { at: Date.now(), body: await readProof() };
  }
  return NextResponse.json(cache.body, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}

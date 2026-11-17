import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { lookupLiveGameForClassroom } from '@/lib/education/liveGameForClassroom';
import logger from '@/utils/logger';

/**
 * GET /api/education/classroom/live-status
 *
 * "Is the signed-in teacher running a live classroom game right now?" — the
 * signal Teacher Home uses to hold back the Teacher Pro offer while a class is
 * in session (ur-audit 2026-11-17: every mid-class offer tap died in the room,
 * 0 checkouts; the ask belongs to post-class moments).
 *
 * Fail-OPEN on purpose ({ live: false }): a Redis or DB hiccup must not hide
 * the revenue surface — the cost of showing the offer during a hiccup is one
 * low-intent impression, the cost of hiding it whenever Redis blinks is the
 * whole funnel. Only a positive lookup suppresses.
 *
 * Response codes: 200 always for a signed-in teacher, 401 signed out, 500 only
 * when the database itself is unconfigured.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { data: classrooms, error } = await admin
      .from('classrooms')
      .select('id')
      .eq('teacher_id', user.id);
    if (error) {
      logger.error('[live-status] classroom list failed:', error);
      return NextResponse.json({ live: false });
    }
    for (const row of classrooms ?? []) {
      const id = (row as { id?: string }).id;
      if (!id) continue;
      // Never throws; null means "not live" (or "unknown", which we treat as not live).
      if (await lookupLiveGameForClassroom(id)) {
        return NextResponse.json({ live: true });
      }
    }
    return NextResponse.json({ live: false });
  } catch (err) {
    logger.error('[live-status] lookup threw:', err instanceof Error ? err.message : err);
    return NextResponse.json({ live: false });
  }
}

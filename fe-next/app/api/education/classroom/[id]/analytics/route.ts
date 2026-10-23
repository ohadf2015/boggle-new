import { NextResponse } from 'next/server';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { requireTeacherPro } from '@/lib/education/pro/requireTeacherPro';
import { readClassAnalytics } from '@/lib/education/pro/classAnalyticsServer';
import logger from '@/utils/logger';

/** GET /api/education/classroom/[id]/analytics — Teacher Pro class dashboard. 401/400/403 ownership, 402 not Pro, 500 read failed. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const notPro = await requireTeacherPro(auth.userId);
  if (notPro) return notPro;

  const { data, error } = await readClassAnalytics(auth.sb, auth.classroom.id);
  if (error || !data) {
    logger.error('[class-analytics] read failed', error);
    return NextResponse.json({ ok: false, error: 'Could not read class analytics' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, metrics: data });
}

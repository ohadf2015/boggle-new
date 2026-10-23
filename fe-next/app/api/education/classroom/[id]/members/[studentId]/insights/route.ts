import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireTeacherPro } from '@/lib/education/pro/requireTeacherPro';
import { loadStudentInsights } from '@/lib/education/studentInsightsLoader';
import logger from '@/utils/logger';

const paramsSchema = z.object({ id: z.string().uuid(), studentId: z.string().uuid() });

/**
 * GET — the same insights the parent report shows, for the owning teacher (Teacher Pro).
 * 400 → 401 → 403 owner → 403 roster → 402 → 500 → 200 { ok, insights }.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; studentId: string }> }) {
  void req;
  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid classroom or student id' }, { status: 400 });
  const { id: classroomId, studentId } = parsed.data;

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { data: owned, error: ownErr } = await sb
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('teacher_id', user.id)
    .maybeSingle();
  if (ownErr) {
    logger.error('[student-insights] ownership check failed', ownErr);
    return NextResponse.json({ ok: false, error: 'Lookup failed' }, { status: 500 });
  }
  if (!owned) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });

  const { data: membership, error: memberErr } = await admin
    .from('classroom_memberships')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (memberErr) {
    logger.error('[student-insights] membership check failed', memberErr);
    return NextResponse.json({ ok: false, error: 'Lookup failed' }, { status: 500 });
  }
  if (!membership) return NextResponse.json({ ok: false, error: 'Student is not a member of this classroom' }, { status: 403 });

  const notPro = await requireTeacherPro(user.id);
  if (notPro) return notPro;

  const result = await loadStudentInsights(admin, studentId, classroomId);
  if (!result.ok) {
    logger.error('[student-insights] progress read failed', result.message);
    return NextResponse.json({ ok: false, error: 'Progress read failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, insights: result.insights });
}

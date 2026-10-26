import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { requireTeacherPro } from '@/lib/education/pro/requireTeacherPro';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadStudentInsights } from '@/lib/education/studentInsightsLoader';
import { getClassReportData, getStudentReportData } from '@/lib/supabase/analyticsReports';
import logger from '@/utils/logger';

const studentIdSchema = z.string().uuid();

/**
 * GET /api/education/classroom/[id]/report[?studentId=] — the Teacher Reports class or student report (Teacher Pro).
 * 401/400/403 ownership → 402 not Pro → 400 bad student → 403 not in class → 500 read failed → 200 { ok, report }.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const notPro = await requireTeacherPro(auth.userId);
  if (notPro) return notPro;

  const classroomId = auth.classroom.id;
  const rawStudentId = new URL(req.url).searchParams.get('studentId');
  if (rawStudentId === null) {
    const { data, error } = await getClassReportData(classroomId, undefined, auth.sb);
    if (error || !data) {
      logger.error('[class-report] read failed', error);
      return NextResponse.json({ ok: false, error: 'Could not read the class report' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, report: data });
  }

  const parsed = studentIdSchema.safeParse(rawStudentId);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid student id' }, { status: 400 });
  const studentId = parsed.data;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });
  const { data: membership, error: memberErr } = await admin
    .from('classroom_memberships')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (memberErr) {
    logger.error('[student-report] membership check failed', memberErr);
    return NextResponse.json({ ok: false, error: 'Lookup failed' }, { status: 500 });
  }
  if (!membership) return NextResponse.json({ ok: false, error: 'Student is not a member of this classroom' }, { status: 403 });

  const { data, error } = await getStudentReportData(studentId, classroomId, undefined, fetch, {
    sb: auth.sb,
    insights: async () => {
      const result = await loadStudentInsights(admin, studentId, classroomId);
      return result.ok ? { ok: true, insights: result.insights } : { ok: false, status: 500 };
    },
  });
  if (error || !data) {
    logger.error('[student-report] read failed', error);
    return NextResponse.json({ ok: false, error: 'Could not read the student report' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, report: data });
}

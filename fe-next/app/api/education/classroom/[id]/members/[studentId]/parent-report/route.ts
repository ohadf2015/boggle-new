import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { signParentReportToken } from '@/lib/education/parentReportToken';
import logger from '@/utils/logger';

const paramsSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

/**
 * POST /api/education/classroom/[id]/members/[studentId]/parent-report
 *
 * Mints a signed, stateless "parent report" link for ONE student in ONE
 * classroom — no account needed to view it, no DB row backs the link (see
 * `lib/education/parentReportToken.ts`).
 *
 * - 401 not signed in
 * - 400 bad ids
 * - 403 caller does not own the classroom
 * - 403 student is not on this classroom's roster
 * - 402 caller does not have Teacher Pro
 * - 500 service role missing, membership check errors, or the signing
 *   secret (`PARENT_REPORT_SECRET`) is not configured — fail closed, never
 *   hand out an unsigned/unscoped link.
 * - 200 { ok: true, path: '/report/<token>' } — the client prepends its
 *   current locale and origin (see `parentReportUrl`), same as the existing
 *   classroom join-link flow.
 *
 * Ownership runs on the request-scoped client (RLS: a stranger reads 0
 * rows). Membership and the Pro entitlement are privileged reads — the
 * membership check needs the definitive answer regardless of a caller's
 * roster-visibility RLS, and the Pro entitlement docs say to prefer
 * service-role (see `checkTeacherSubscription`).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string; studentId: string }> }) {
  void req;
  const parsedParams = paramsSchema.safeParse(await ctx.params);
  if (!parsedParams.success) {
    return NextResponse.json({ ok: false, error: 'Invalid classroom or student id' }, { status: 400 });
  }
  const { id: classroomId, studentId } = parsedParams.data;

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
    logger.error('[parent-report] ownership check failed', ownErr);
    return NextResponse.json({ ok: false, error: ownErr.message }, { status: 500 });
  }
  if (!owned) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });
  }

  const { data: membership, error: memberErr } = await admin
    .from('classroom_memberships')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (memberErr) {
    logger.error('[parent-report] membership check failed', memberErr);
    return NextResponse.json({ ok: false, error: memberErr.message }, { status: 500 });
  }
  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Student is not a member of this classroom' }, { status: 403 });
  }

  const subscription = await checkTeacherSubscription(user.id);
  if (!subscription.has_pro) {
    return NextResponse.json({ ok: false, error: 'Teacher Pro required' }, { status: 402 });
  }

  let token: string;
  try {
    token = signParentReportToken(studentId, classroomId);
  } catch (err) {
    logger.error('[parent-report] token signing failed', err);
    return NextResponse.json({ ok: false, error: 'Report links are not configured' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path: `/report/${token}` });
}

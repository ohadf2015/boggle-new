import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';
import { LEVEL_ORDER } from '@/lib/education/differentiation';

const paramsSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
});

const bodySchema = z.object({
  level: z.enum(LEVEL_ORDER as unknown as [string, ...string[]]),
});

/**
 * PATCH /api/education/classroom/[id]/members/[studentId]
 * Body: { level: 'support' | 'core' | 'challenge' }
 *
 * Sets the differentiation level on ONE membership row (this student, in this
 * classroom). Owning teacher only.
 *
 * - 401 not signed in
 * - 403 caller does not own the classroom
 * - 400 bad ids / bad body
 * - 404 no membership row changed (student is not on this roster)
 * - 500 service role missing or DB error
 *
 * Mutation path, so auth is the direct `auth.getUser()` (see getAuthedUser docs).
 * The ownership check runs on the request-scoped client (classrooms SELECT is
 * owner/member/admin-only, so a stranger reads 0 rows). The WRITE goes through the
 * service-role client and asserts exactly one row came back from `.select()`:
 * under RLS a non-matching update returns `data: []` with `error: null` — a
 * silent no-op that would otherwise be reported as success.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; studentId: string }> }) {
  const parsedParams = paramsSchema.safeParse(await ctx.params);
  if (!parsedParams.success) {
    return NextResponse.json({ ok: false, error: 'Invalid classroom or student id' }, { status: 400 });
  }
  const { id: classroomId, studentId } = parsedParams.data;

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ ok: false, error: 'level must be support | core | challenge' }, { status: 400 });
  }
  const level = parsedBody.data.level;

  const { data: owned, error: ownErr } = await sb
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('teacher_id', user.id)
    .maybeSingle();
  if (ownErr) {
    logger.error('[member-level] ownership check failed', ownErr);
    return NextResponse.json({ ok: false, error: ownErr.message }, { status: 500 });
  }
  if (!owned) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });
  }

  const r = await admin
    .from('classroom_memberships')
    .update({ level })
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .select('id, level');
  if (r.error) {
    logger.error('[member-level] update failed', r.error);
    return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
  }
  if (!r.data || r.data.length !== 1) {
    // Zero rows = not on this roster (or already removed). >1 is impossible under the
    // (classroom_id, student_id) UNIQUE constraint but is not success either.
    logger.warn(`[member-level] expected 1 row, got ${r.data?.length ?? 0} for ${classroomId}/${studentId}`);
    return NextResponse.json({ ok: false, error: 'Student is not a member of this classroom' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, level });
}

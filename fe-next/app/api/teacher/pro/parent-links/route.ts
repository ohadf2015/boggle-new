import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { signParentReportToken } from '@/lib/education/parentReportToken';
import { resolveDisplayName } from '@/lib/displayName';
import logger from '@/utils/logger';

const bodySchema = z.object({ classroomId: z.string().uuid() });
const MAX_STUDENTS = 300;

/**
 * POST /api/teacher/pro/parent-links — one signed parent-report link per student
 * in a class the caller owns (Teacher Pro). Same token and checks as the
 * single-student route, batched: 400 → 401 → 403 → 402 → 500 → 200.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid classroom id' }, { status: 400 });
  const { classroomId } = parsed.data;

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { data: owned, error: ownErr } = await sb
    .from('classrooms')
    .select('id, name')
    .eq('id', classroomId)
    .eq('teacher_id', user.id)
    .maybeSingle();
  if (ownErr) {
    logger.error('[parent-links] ownership check failed', ownErr);
    return NextResponse.json({ ok: false, error: 'Lookup failed' }, { status: 500 });
  }
  if (!owned) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const subscription = await checkTeacherSubscription(user.id);
  if (!subscription.has_pro) {
    return NextResponse.json({ ok: false, error: 'Teacher Pro required' }, { status: 402 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });

  const { data: members, error: memberErr } = await admin
    .from('classroom_memberships')
    .select('student_id')
    .eq('classroom_id', classroomId)
    .order('joined_at', { ascending: true });
  if (memberErr) {
    logger.error('[parent-links] roster read failed', memberErr);
    return NextResponse.json({ ok: false, error: 'Roster read failed' }, { status: 500 });
  }

  const studentIds = ((members ?? []) as Array<{ student_id: string | null }>)
    .map((m) => m.student_id)
    .filter((id): id is string => typeof id === 'string' && id !== '')
    .slice(0, MAX_STUDENTS);

  const names = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: profiles, error: profErr } = await admin
      .from('public_profiles')
      .select('id, display_name, username')
      .in('id', studentIds);
    if (profErr) logger.warn('[parent-links] profile read failed, links stay unnamed', profErr);
    for (const p of (profiles ?? []) as Array<{ id: string; display_name: string | null; username: string | null }>) {
      names.set(p.id, resolveDisplayName([p.display_name, p.username], ''));
    }
  }

  try {
    const links = studentIds.map((studentId) => ({
      studentId,
      name: names.get(studentId) ?? '',
      path: `/report/${signParentReportToken(studentId, classroomId)}`,
    }));
    return NextResponse.json({ ok: true, classroomName: (owned as { name?: string }).name ?? '', links });
  } catch (err) {
    logger.error('[parent-links] token signing failed', err);
    return NextResponse.json({ ok: false, error: 'Report links are not configured' }, { status: 500 });
  }
}

/**
 * POST /api/education/teacher/funnel-step
 *
 * Server emit for the two funnel steps that are not themselves a server write
 * (onboarding gate done, first assignment inserted from the browser). Approval,
 * classroom create, student join and Polar trial emit directly and are rejected
 * here so a client cannot invent them.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { isQaEmail } from '@/backend/utils/educationRoundTelemetry';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
import { isClientTeacherFunnelStep } from '@/lib/education/teacherFunnelStep';
import { emitTeacherFunnelStep } from '@/lib/education/teacherFunnelStepServer';

export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const step = (body as { step?: unknown } | null)?.step;
  if (!isClientTeacherFunnelStep(step)) {
    return NextResponse.json({ error: 'invalid step' }, { status: 400 });
  }

  const isTestAccount = isQaEmail(user.email) || (await isAnyTestAccount(createAdminClient(), [user.id]));
  emitTeacherFunnelStep({ teacherId: user.id, step, isTestAccount });
  return NextResponse.json({ ok: true });
}

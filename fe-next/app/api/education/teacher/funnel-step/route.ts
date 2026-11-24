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
import { isClientTeacherFunnelStep, TEACHER_FUNNEL_STEP_EVENT } from '@/lib/education/teacherFunnelStep';
import { emitTeacherFunnelStep } from '@/lib/education/teacherFunnelStepServer';

/** Writer key the 30-day SQL reader counts. Never throws. */
async function persistClientFunnelStep(userId: string, step: string): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    const { error } = await admin.from('subscription_events').insert({
      user_id: userId,
      event_type: TEACHER_FUNNEL_STEP_EVENT,
      payload: { step },
    });
    if (error) console.error('[teacher-funnel-step] durable write failed', error.message);
  } catch (err) {
    console.error('[teacher-funnel-step] durable write threw', err);
  }
}

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
  // The 30-day readout used to hardcode this step as NULL (PostHog only). Persist
  // the same pair the SQL counts, or a fired beacon is invisible to the reader.
  await persistClientFunnelStep(user.id, step);
  return NextResponse.json({ ok: true });
}

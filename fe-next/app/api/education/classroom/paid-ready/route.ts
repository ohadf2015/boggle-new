import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { canCreateClass } from '@/lib/subscriptions';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import { defaultClassName, isPaidMedium } from '@/lib/education/paidDay0';
import { sendPaidShareCodeNow } from '@/lib/education/paidShareCodeNow';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import { buildClassroomCreatedEvent, isQaEmail } from '@/backend/utils/educationRoundTelemetry';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
import {
  buildTeacherActivationFunnelStepEvent,
  resolveTeacherActivationPlan,
} from '@/lib/education/teacherActivationFunnelServer';
import logger from '@/utils/logger';

/**
 * POST /api/education/classroom/paid-ready
 * Idempotent first classroom for a paid edu_access teacher. Not a prod write
 * from the agent — this runs when that teacher opens the day-0 screen.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('utm_medium, user_role, display_name, username, language')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!isPaidMedium(profile?.utm_medium) || (profile?.user_role !== 'teacher' && profile?.user_role !== 'admin')) {
    return NextResponse.json({ error: 'not_paid_teacher' }, { status: 403 });
  }

  let locale = typeof profile?.language === 'string' ? profile.language : 'en';
  try {
    const body = await request.json();
    if (typeof body?.language === 'string' && (EDUCATION_LANGUAGES as readonly string[]).includes(body.language)) {
      locale = body.language;
    }
  } catch {
    /* empty body is fine */
  }

  const { data: existing, error: existingError } = await admin
    .from('classrooms')
    .select('id, name, join_code, language')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const classroom = existing?.[0] ?? await createFirstClass(admin, user.id, user.email, locale);
  if (!classroom) return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });

  if (user.email) {
    try {
      await sendPaidShareCodeNow(admin, {
        userId: user.id,
        email: user.email,
        fullName: profile?.display_name || profile?.username || 'Teacher',
        locale,
      });
    } catch (err) {
      logger.error('[paid-ready] share-code nudge failed', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ data: classroom, created: !existing?.[0] });
}

async function createFirstClass(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  teacherId: string,
  email: string | undefined,
  locale: string,
) {
  const cap = await canCreateClass(teacherId);
  if (!cap.allowed) return null;
  const language = (EDUCATION_LANGUAGES as readonly string[]).includes(locale) ? locale : 'en';
  const { data, error } = await admin
    .from('classrooms')
    .insert({ teacher_id: teacherId, name: defaultClassName(language), language })
    .select('id, name, join_code, language')
    .single();
  if (error || !data) {
    logger.error('[paid-ready] create failed', error?.message);
    return null;
  }
  const isTestAccount = isQaEmail(email) || (await isAnyTestAccount(admin, [teacherId]));
  const events = [
    buildClassroomCreatedEvent({ teacherId, classroomId: data.id, language, isTestAccount }),
  ];
  try {
    events.push(buildTeacherActivationFunnelStepEvent({
      teacherId,
      step: 'first_classroom',
      locale: language,
      plan: await resolveTeacherActivationPlan(teacherId),
      isTestAccount,
    }));
  } catch (err) {
    logger.error('[paid-ready] activation step skipped', err instanceof Error ? err.message : err);
  }
  captureEduServerEvents(events);
  return data;
}

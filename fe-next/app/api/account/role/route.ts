import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { promoteDecision } from '@/lib/education/promoteStudentToTeacher';
import logger from '@/utils/logger';

/**
 * POST /api/account/role
 * A confirmed student becomes a teacher on the same account. profiles RLS
 * blocks the self-update, so this is the only door. Guests and unconfirmed
 * emails are refused — they are how a typo'd signup would otherwise escalate.
 */
export async function POST(request: NextRequest) {
  const authed = await getAuthedUser(request);
  if (!authed?.id) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, code: 'UNAVAILABLE' }, { status: 503 });

  const [authUser, profile] = await Promise.all([
    admin.auth.admin.getUserById(authed.id),
    admin.from('profiles').select('user_role, is_admin').eq('id', authed.id).maybeSingle(),
  ]);
  if (authUser.error || profile.error) {
    logger.error('role switch lookup failed', authUser.error?.message, profile.error?.message);
    return NextResponse.json({ ok: false, code: 'UNAVAILABLE' }, { status: 503 });
  }

  const user = authUser.data.user;
  const decision = promoteDecision({
    userId: authed.id,
    email: user?.email ?? authed.email,
    emailConfirmedAt: user?.email_confirmed_at ?? null,
    isAnonymous: user?.is_anonymous === true,
    userRole: profile.data?.user_role ?? null,
    isAdmin: profile.data?.is_admin === true,
  });

  if (decision === 'already_teacher') return NextResponse.json({ ok: true, user_role: 'teacher' });
  if (decision === 'unconfirmed') return NextResponse.json({ ok: false, code: 'UNCONFIRMED' }, { status: 403 });
  if (decision === 'anonymous') return NextResponse.json({ ok: false, code: 'ANONYMOUS' }, { status: 403 });
  if (decision !== 'promote') return NextResponse.json({ ok: false, code: 'REFUSED' }, { status: 403 });

  const promoted = await admin.from('profiles').update({ user_role: 'teacher' }).eq('id', authed.id).select('id');
  if (promoted.error || !promoted.data?.length) {
    logger.error('role switch update failed', promoted.error?.message);
    return NextResponse.json({ ok: false, code: 'UNAVAILABLE' }, { status: 503 });
  }
  return NextResponse.json({ ok: true, user_role: 'teacher' });
}

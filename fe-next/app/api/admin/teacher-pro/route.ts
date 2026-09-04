import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { createAdminClient } from '@/utils/supabase/admin';
import { grantTeacherPro } from '@/lib/education/proGrantServer';
import { PRO_GRANT_MAX_DAYS, proGrantStatus, type ProGrantRow } from '@/lib/education/proGrant';

/**
 * Admin: complimentary Teacher Pro by email.
 *
 * POST grants (default a year) and emails the teacher. GET lists every grant
 * with a derived status so the admin can see who is on, who has not signed up
 * yet, and what has lapsed. Writes go through lib/education/proGrantServer.ts.
 */

const GrantBody = z.object({
  email: z.string().trim().email(),
  days: z.number().int().min(1).max(PRO_GRANT_MAX_DAYS).optional(),
  note: z.string().trim().max(1000).optional(),
  reason: z.string().trim().max(200).optional(),
  fullName: z.string().trim().max(120).optional(),
  locale: z.enum(['en', 'he', 'sv', 'ja', 'es', 'ru']).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success || !auth.user) return auth.response!;

  let raw: unknown = {};
  try { raw = await request.json(); } catch { /* fall through to validation */ }
  const parsed = GrantBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid body', issues: parsed.error.issues }, { status: 400 });
  }

  const result = await grantTeacherPro({ ...parsed.data, grantedBy: auth.user.id });
  if (!result.ok) {
    if (result.error === 'invalid_email') return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    // A paying teacher keeps their paid plan. Surface it as a conflict, not a failure.
    if (result.error === 'already_paid') return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    console.error('[teacher-pro grant] failed for', parsed.data.email, '-', result.error);
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  if (!result.emailSent) {
    // The grant stands — it is the part that helps them — but the admin must know
    // the email did not go out so they can resend or write by hand.
    console.error('[teacher-pro grant] granted but email failed for', result.email, '-', result.emailError);
  }

  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) return auth.response!;

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });

  const { data, error } = await admin
    .from('teacher_pro_grants')
    .select('id, email, user_id, granted_by, days, note, reason, full_name, locale, starts_at, expires_at, applied_at, email_sent_at, welcomed_at, revoked_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const now = Date.now();
  const rows = ((data ?? []) as Array<ProGrantRow & Record<string, unknown>>).map((r) => ({
    ...r,
    status: proGrantStatus(r, now),
  }));
  return NextResponse.json({ ok: true, rows });
}

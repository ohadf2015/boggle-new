import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessConfirmation } from '@/lib/email/templates/teacherAccessConfirmation';
import { teacherTrialExpiry } from '@/lib/education/trial';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: any = {}; try { body = await req.json(); } catch {}
  const message = typeof body.message === 'string' ? body.message.slice(0, 1000) : undefined;
  const sb = await createClient();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('id, is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ ok: false }, { status: 403 });

  const { data: row, error: fetchErr } = await sb.from('teacher_access_requests').select('*').eq('id', id).single();
  if (fetchErr || !row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  // Approval starts a time-limited trial — stamp the deadline so the email and
  // the teacher UI can drive activation urgency. Reuse an existing deadline on
  // re-approval rather than silently extending the window.
  const trialExpiresAt = row.trial_expires_at || teacherTrialExpiry(Date.now());

  const upd = await sb.from('teacher_access_requests').update({
    status: 'approved',
    trial_expires_at: trialExpiresAt,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq('id', id);
  if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });

  if (row.user_id) {
    // `profiles` RLS is `auth.uid() = id` with no admin bypass, so promoting
    // ANOTHER user's row through the request-scoped client `sb` matches zero
    // rows and reports no error — a silent no-op. That left every approved
    // teacher on the default `user_role='student'`, and /teacher's role check
    // bounced them straight back to the homepage (14 approved, 0 promoted,
    // 1 classroom ever, measured 2026-08-12). Go through the service-role
    // client and require that a row actually changed.
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'service role key not configured' }, { status: 500 });
    }
    const r = await admin.from('profiles').update({ user_role: 'teacher' }).eq('id', row.user_id).select('id');
    if (r.error) return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
    if (!r.data?.length) {
      return NextResponse.json({ ok: false, error: 'profile not promoted' }, { status: 500 });
    }
  } else {
    const r = await sb.from('teacher_access_allowlist').insert({
      // Normalised on write so redemption can match on a plain lowercase probe.
      // Storing the address verbatim left mixed-case rows unredeemable.
      email: row.email.toLowerCase(),
      approved_by: user.id,
      source_request_id: row.id,
      trial_expires_at: trialExpiresAt,
    });
    if (r.error && !r.error.message.includes('duplicate')) {
      return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
    }
  }

  // Email is best-effort — the approval (DB state) is the source of truth and
  // must not be undone by a flaky mail provider, so failures don't 500. But
  // sendEmail reports provider rejections (bad key, unverified sender domain,
  // Resend API error) via a resolved { ok:false } result rather than a throw,
  // so we must inspect that result and log it — otherwise a failed trial email
  // vanishes with zero trace (silent no-op).
  try {
    const tpl = teacherAccessConfirmation({ full_name: row.full_name, locale: row.locale, message, trialExpiresAt });
    const sent = await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });
    if (!sent.ok) {
      console.error('[teacher-access approve] email send failed for', row.email, '-', sent.error);
    }
  } catch (e) {
    console.error('[teacher-access approve] email send threw', e);
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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
    const r = await sb.from('profiles').update({ user_role: 'teacher' }).eq('id', row.user_id);
    if (r.error) return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
  } else {
    const r = await sb.from('teacher_access_allowlist').insert({
      email: row.email,
      approved_by: user.id,
      source_request_id: row.id,
      trial_expires_at: trialExpiresAt,
    });
    if (r.error && !r.error.message.includes('duplicate')) {
      return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });
    }
  }

  // Email is best-effort — the approval (DB state) is the source of truth and
  // must not be undone by a flaky mail provider, so failures are swallowed.
  try {
    const tpl = teacherAccessConfirmation({ full_name: row.full_name, locale: row.locale, message, trialExpiresAt });
    await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });
  } catch (e) {
    console.error('[teacher-access approve] email send failed', e);
  }

  return NextResponse.json({ ok: true });
}

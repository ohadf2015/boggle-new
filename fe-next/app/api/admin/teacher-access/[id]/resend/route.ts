import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessConfirmation } from '@/lib/email/templates/teacherAccessConfirmation';

// Re-send the approval/welcome email to a teacher whose request is ALREADY
// approved. Unlike /approve, this performs no state transition (no role grant,
// no allowlist insert) — the email is the entire operation, so a send failure
// is surfaced as a non-2xx instead of being swallowed.
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

  if (row.status !== 'approved') {
    return NextResponse.json({ ok: false, error: 'not approved' }, { status: 400 });
  }

  // The email IS the whole operation here, so any failure must surface as a
  // non-2xx. sendEmail signals a provider rejection via a resolved { ok:false }
  // result (it only throws on unexpected errors), so we handle BOTH: a false
  // result and a thrown exception.
  try {
    const tpl = teacherAccessConfirmation({ full_name: row.full_name, locale: row.locale, message, trialExpiresAt: row.trial_expires_at });
    const sent = await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });
    if (!sent.ok) {
      console.error('[teacher-access resend] email send failed for', row.email, '-', sent.error);
      return NextResponse.json({ ok: false, error: sent.error || 'email send failed' }, { status: 502 });
    }
  } catch (e) {
    console.error('[teacher-access resend] email send threw', e);
    return NextResponse.json({ ok: false, error: 'email send failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

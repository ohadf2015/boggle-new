import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { createAdminClient } from '../../../../utils/supabase/admin';
import { getAuthedUser } from '../../../../lib/auth/getAuthedUser';
import { sendEmail } from '../../../../lib/email/send';
import { teacherAccessAdminNotify } from '../../../../lib/email/templates/teacherAccessAdminNotify';
import { teacherAccessConfirmation } from '../../../../lib/email/templates/teacherAccessConfirmation';
import { teacherTrialExpiry } from '../../../../lib/education/trial';
import type { TeacherAccessFormPayload } from '../../../../lib/education/types';

const ROLES = ['teacher', 'tutor', 'admin', 'parent', 'researcher', 'other'] as const;
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid json'); }

  const { role, locale, use_case, school_or_org } = body || {};

  if (!ROLES.includes(role)) return bad('invalid role');
  if (!LOCALES.includes(locale)) return bad('invalid locale');
  if (typeof use_case !== 'string' || use_case.length < 10 || use_case.length > 800) return bad('use_case must be 10-800 chars');
  if (school_or_org && (typeof school_or_org !== 'string' || school_or_org.length > 200)) return bad('invalid school_or_org');

  const sb = await createClient();

  // Teacher access requires a signed-up account with a verified email. The
  // request is bound to that verified identity — the email is taken from the
  // account (not the form body), so a request can never be filed for an
  // address the requester hasn't proven they own.
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return bad('sign up and sign in to request teacher access', 401);
  if (!user.email_confirmed_at) return bad('verify your email address first', 403);
  if (!user.email || !EMAIL_RE.test(user.email)) return bad('account has no verified email', 403);
  const email = user.email;

  // Name and country are already captured at signup — never re-asked in the
  // form. Derive them from the account/profile so the stored request stays
  // consistent with the verified identity (single source of truth).
  const { data: profile } = await sb
    .from('profiles')
    .select('display_name, username, country_code')
    .eq('id', user.id)
    .maybeSingle();
  const metaName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    '';
  const full_name = (profile?.display_name || profile?.username || metaName || email.split('@')[0])
    .toString()
    .slice(0, 120);
  const country = profile?.country_code || undefined;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await sb
    .from('teacher_access_requests')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if ((recent.count || 0) >= 3) return bad('too many requests in 24h, try again later', 429);

  const payload: TeacherAccessFormPayload = { email, full_name, role, locale, use_case, school_or_org, country };
  const ins = await sb.from('teacher_access_requests').insert({ ...payload, user_id: user.id });
  // 23505 = unique_violation from uniq_tar_one_pending_per_user: a racing
  // second submit hit the one-pending-request-per-user index. That is the
  // idempotency guard doing its job — the first request's row is canonical,
  // so fall through and let the approval below promote it. Every other
  // insert error is real.
  if (ins.error && ins.error.code !== '23505') return bad('insert failed: ' + ins.error.message, 500);

  // Access is granted INSTANTLY on submit — no manual review step. The insert
  // only records the request; approval promotes the account in the same
  // request so the client can redirect straight to /teacher.
  //
  // BOTH writes go through the service-role client: teacher_access_requests
  // RLS has no user UPDATE policy (only tar_admin_update), so approving via
  // the request-scoped client silently matches 0 rows and leaves the request
  // 'pending' forever, and profiles RLS blocks self-escalation of user_role
  // the same way.
  const admin = createAdminClient();
  if (!admin) return bad('service role key not configured', 500);

  const trialExpiresAt = teacherTrialExpiry(Date.now());
  const nowIso = new Date().toISOString();
  const approve = await admin
    .from('teacher_access_requests')
    .update({ status: 'approved', trial_expires_at: trialExpiresAt, reviewed_at: nowIso })
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .select('id');
  // Approves this user's pending row (exactly one can exist —
  // uniq_tar_one_pending_per_user), whether this request inserted it or a
  // racing duplicate did and we fell through on 23505.
  if (approve.error) return bad('approval failed: ' + approve.error.message, 500);
  if (!approve.data?.length) {
    // The racing twin request approved the row first — a double-submit
    // converged on a single row. Confirm an approved request exists and
    // report the same success instead of a bogus 500 (the twin owns the
    // profile promotion and notification emails).
    const { data: already } = await admin
      .from('teacher_access_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .limit(1);
    if (!already?.length) return bad('request not approved', 500);
    return NextResponse.json({ ok: true, success: true });
  }

  const promoted = await admin.from('profiles').update({ user_role: 'teacher' }).eq('id', user.id).select('id');
  if (promoted.error) return bad('promotion failed: ' + promoted.error.message, 500);
  if (!promoted.data?.length) return bad('profile not promoted', 500);

  const tpl = teacherAccessAdminNotify(payload);
  await sendEmail({ to: 'lexiclash.game@gmail.com', subject: tpl.subject, html: tpl.html });

  // Confirmation email is best-effort — the approval (DB state) is the source
  // of truth and must not be undone by a flaky mail provider, so failures
  // don't 500. sendEmail reports provider rejections via a resolved
  // { ok:false } rather than a throw, so inspect it and log.
  try {
    const confirmTpl = teacherAccessConfirmation({ full_name, locale, trialExpiresAt });
    const sent = await sendEmail({ to: email, subject: confirmTpl.subject, html: confirmTpl.html });
    if (!sent.ok) {
      console.error('[access-request] confirmation email failed for', email, '-', sent.error);
    }
  } catch (e) {
    console.error('[access-request] confirmation email threw', e);
  }

  // Both keys on purpose: this route's error path answers { ok: false, error }, so a caller that
  // checks `ok` saw undefined on success — the shapes disagreed. `success` stays for any existing
  // consumer; `ok` makes the success and failure envelopes match.
  return NextResponse.json({ ok: true, success: true });
}

export async function GET(request: NextRequest) {
  const sb = await createClient();
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ row: null });
  const { data } = await sb.from('teacher_access_requests')
    .select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ row: data });
}

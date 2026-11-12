import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { sendEmail } from '@/lib/email/send';
import { teacherAccessAdminNotify } from '@/lib/email/templates/teacherAccessAdminNotify';
import { teacherAccessConfirmation } from '@/lib/email/templates/teacherAccessConfirmation';
import { teacherTrialExpiry } from '@/lib/education/trial';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import { isPaidMedium } from '@/lib/education/paidDay0';
import { testEmailReason } from '@/lib/education/checkoutTrafficTags';
import { buildEduAccessRequestCreatedEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import type { TeacherAccessFormPayload } from '@/lib/education/types';
import { notifyAdmins } from '@/lib/admin/adminNotifications';
import { teacherRequestNotice } from '@/lib/admin/adminEvents';
import { accessStanding, type HistoryRow } from '@/lib/education/accessStanding';

const ROLES = ['teacher', 'tutor', 'admin', 'parent', 'researcher', 'other'] as const;
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function refuse(code: string, status: number) {
  return NextResponse.json({ ok: false, error: code, code }, { status });
}

// The request row is already committed when this answers, so a generic 500
// would lie ("Something went wrong" next to a durably filed request). 202 +
// approvalPending tells the client the truth: received, approval still
// processing. A re-submit re-runs the approval on that same pending row, with
// no new row, so the path self-heals.
function pendingApproval() {
  return NextResponse.json({ ok: true, success: true, approvalPending: true }, { status: 202 });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid json'); }

  const { locale, school_or_org } = body || {};
  // Access is granted on submit; role is an optional tap, the reason is required free text.
  const rolePicked = body?.role !== undefined && body?.role !== null;
  const role = rolePicked ? body.role : 'teacher';
  const rawUseCase = body?.use_case;

  if (!ROLES.includes(role)) return bad('invalid role');
  if (!LOCALES.includes(locale)) return bad('invalid locale');
  if (typeof rawUseCase !== 'string') return bad('use_case is required');
  const use_case = rawUseCase.trim();
  if (use_case.length < 10 || use_case.length > 800) return bad('use_case must be 10-800 chars');
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
  // Also fetch user_role and is_admin for the idempotency guard: if this
  // account already has teacher access, short-circuit the request without
  // inserting, updating, or emailing (idempotent success).
  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('display_name, username, country_code, user_role, is_admin, utm_medium')
    .eq('id', user.id)
    .maybeSingle();

  // Fail CLOSED on genuine profile fetch errors. maybeSingle() returns
  // { data: null, error: null } when the row simply does not exist (legitimate
  // for brand-new users); only a non-null error means "cannot verify, refuse to write".
  if (profileError) {
    console.error('[access-request] profile fetch failed for', email, '-', profileError.message);
    return refuse('lookup_failed', 500);
  }
  const metaName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    '';
  const full_name = (profile?.display_name || profile?.username || metaName || email.split('@')[0])
    .toString()
    .slice(0, 120);
  const country = profile?.country_code || undefined;

  // Idempotency guard: if this account already has teacher access, return success
  // without inserting, updating, or emailing. This prevents duplicate requests from
  // racing to insert and then both approving the same row, and handles the case
  // where a teacher re-submits after their first request auto-approved.
  if (isTeacherProfile(profile)) {
    return NextResponse.json({ ok: true, success: true, alreadyApproved: true, paidDay0: isPaidMedium(profile?.utm_medium) });
  }

  // Every branch reads this user's own history, so no press can undo a decline or start a second trial clock.
  const loadHistory = async (): Promise<HistoryRow[] | null> => {
    const history = await sb
      .from('teacher_access_requests')
      .select('id, status, trial_expires_at, created_at, reviewed_at, reviewed_by')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (history.error) {
      console.error('[access-request] history lookup failed for', email, '-', history.error.message);
      return null;
    }
    return (history.data ?? []) as HistoryRow[];
  };
  const askForReview = async () => {
    await notifyAdmins({
      ...teacherRequestNotice({ full_name, role, school_or_org, country, autoApproved: false }),
      title: `Teacher access needs a look: ${full_name}`,
      dedupeKey: `teacher_access_review:${user.id}`,
    });
    return refuse('needs_review', 409);
  };

  let rows = await loadHistory();
  if (!rows) return refuse('lookup_failed', 500);
  let { standing, pending } = accessStanding(rows);

  const payload: TeacherAccessFormPayload = { email, full_name, role, locale, use_case, school_or_org, country };
  const isNewRow = standing === 'new';
  if (standing === 'new') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await sb
      .from('teacher_access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', since);
    if ((recent.count || 0) >= 3) return bad('too many requests in 24h, try again later', 429);

    const ins = await sb.from('teacher_access_requests').insert({ ...payload, user_id: user.id }).select('id').single();
    if (ins.error && (ins.error as { code?: string }).code === '23505') {
      // A concurrent press inserted first; converge on its row.
      rows = await loadHistory();
      if (!rows) return refuse('lookup_failed', 500);
      ({ standing, pending } = accessStanding(rows));
    } else if (ins.error || !ins.data) {
      console.error('[access-request] insert failed for', email, '-', ins.error?.message ?? 'no row returned');
      return refuse('insert_failed', 500);
    } else {
      standing = 'pending';
      pending = { id: (ins.data as { id: string }).id, status: 'pending', trial_expires_at: null, created_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null };
    }
  }
  if (standing === 'declined') return refuse('declined', 403);
  if (standing === 'review' || !pending) return askForReview();
  const pendingId = pending.id;
  const priorTrial = rows.find((r) => r.trial_expires_at)?.trial_expires_at ?? null;

  // Every early exit below leaves the request pending; the owner still has to hear about it.
  const pendingAndTell = async () => {
    await notifyAdmins({
      ...teacherRequestNotice({ full_name, role, school_or_org, country, autoApproved: false }),
      dedupeKey: `teacher_request_pending:${user.id}`,
    });
    return pendingApproval();
  };

  // Growth Radar server step: record request creation once durably inserted.
  if (isNewRow) {
    try {
      captureProFunnelServerEvent(
        buildEduAccessRequestCreatedEvent(user.id, { role, locale, role_picked: rolePicked })
      );
    } catch {
      /* telemetry failure must never break access request */
    }
  }

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
  if (!admin) {
    console.error('[access-request] service role key not configured — request left pending for', email);
    return pendingAndTell();
  }

  const trialExpiresAt = priorTrial ?? teacherTrialExpiry(Date.now());
  const nowIso = new Date().toISOString();
  // Only the chosen row: the status check allows no "superseded" value, so older duplicate pending rows stay as they are.
  const approve = await admin
    .from('teacher_access_requests')
    .update({ status: 'approved', trial_expires_at: trialExpiresAt, reviewed_at: nowIso })
    .eq('id', pendingId)
    .eq('status', 'pending')
    .select('id');
  if (approve.error) {
    console.error('[access-request] approval failed for', email, '-', approve.error.message);
    return pendingAndTell();
  }
  if (!approve.data?.length) {
    // Another press changed this row first: succeed only if the role is really there now.
    const [{ data: nowProfile }, { data: nowRow }] = await Promise.all([
      admin.from('profiles').select('user_role').eq('id', user.id).maybeSingle(),
      admin.from('teacher_access_requests').select('status').eq('id', pendingId).maybeSingle(),
    ]);
    if (isTeacherProfile(nowProfile)) return NextResponse.json({ ok: true, success: true, paidDay0: isPaidMedium(profile?.utm_medium) });
    if (nowRow?.status === 'declined') return refuse('declined', 403);
    console.error('[access-request] approval matched no pending row and the role is not set yet for', email);
    return pendingAndTell();
  }

  const promoted = await admin.from('profiles').update({ user_role: 'teacher' }).eq('id', user.id).select('id');
  if (promoted.error || !promoted.data?.length) {
    console.error('[access-request] profile promotion failed for', email, '-', promoted.error?.message ?? 'matched no row');
    // Back to pending (trial date kept) so the next press finishes it, instead of an approved row with no role.
    const rollback = await admin
      .from('teacher_access_requests')
      .update({ status: 'pending' })
      .eq('id', pendingId)
      .eq('status', 'approved')
      .select('id');
    if (rollback.error || !rollback.data?.length) {
      console.error('[access-request] rollback to pending failed for', email, '-', rollback.error?.message ?? 'matched no row');
      return askForReview();
    }
    return pendingAndTell();
  }

  // Admin notify is best-effort like the confirmation below, but never
  // silent — a failed notify means nobody knows a request needs attention.
  const tpl = teacherAccessAdminNotify(payload);
  const notified = await sendEmail({ to: 'lexiclash.game@gmail.com', subject: tpl.subject, html: tpl.html });
  if (!notified.ok) {
    console.error('[access-request] admin notify email failed -', notified.error);
  }
  await notifyAdmins(teacherRequestNotice({ full_name, role, school_or_org, country, autoApproved: true }));

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

  const paidDay0 = isPaidMedium(profile?.utm_medium);
  try {
    captureProFunnelServerEvent({
      distinctId: user.id,
      event: 'edu_access_completed_to_class',
      properties: {
        product: 'teacher_pro',
        locale,
        role,
        role_picked: rolePicked,
        destination: paidDay0 ? 'paid_class' : 'class_setup',
        is_test_account: testEmailReason(email) !== null,
      },
    });
  } catch {
    /* telemetry failure must never break access request */
  }

  // Both keys on purpose: this route's error path answers { ok: false, error }, so a caller that
  // checks `ok` saw undefined on success — the shapes disagreed. `success` stays for any existing
  // consumer; `ok` makes the success and failure envelopes match.
  return NextResponse.json({ ok: true, success: true, paidDay0 });
}

const APPLICANT_COLUMNS = 'id, status, role, use_case, created_at, trial_expires_at, admin_note';
const APPLICANT_FIELDS = ['id', 'status', 'role', 'use_case', 'created_at', 'trial_expires_at'] as const;

// The note travels only on a decline: it is the reason the decline email already sent the applicant.
function applicantView(row: Record<string, unknown>): Record<string, unknown> {
  const view: Record<string, unknown> = {};
  for (const key of APPLICANT_FIELDS) if (key in row) view[key] = row[key];
  if (row.status === 'declined' && 'admin_note' in row) view.admin_note = row.admin_note;
  return view;
}

export async function GET(request: NextRequest) {
  const sb = await createClient();
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ row: null });
  const { data, error } = await sb.from('teacher_access_requests')
    .select(APPLICANT_COLUMNS).eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    console.error('[access-request] request lookup failed for', user.id, '-', error.message);
    return refuse('lookup_failed', 500);
  }
  return NextResponse.json({ row: data ? applicantView(data as Record<string, unknown>) : null });
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { teacherProGift } from '@/lib/email/templates/teacherProGift';
import type { TeacherLocale } from '@/lib/education/types';
import {
  PRO_GRANT_DEFAULT_DAYS,
  isPaidProviderSubscription,
  normalizeGrantEmail,
  proGrantExpiry,
} from './proGrant';

/**
 * Grant / claim / revoke complimentary Teacher Pro. Every statement runs on the
 * SERVICE-ROLE client: these are writes on ANOTHER user's `subscriptions` and
 * `profiles` rows, which the request-scoped client cannot see (RLS returns zero
 * rows, not an error — the class of bug behind "14 approved, 0 promoted").
 * Each write asserts its affected-row count for the same reason.
 *
 * Order matters in `grantTeacherPro`: DB first, email last. The email names a
 * deadline; sending it before the row exists would promise Pro the teacher does
 * not have. A failed email after a successful grant is reported (`emailSent`)
 * but does not undo the grant — the grant is the part that helps them.
 */

interface Deps {
  admin?: SupabaseClient | null;
}

export interface GrantTeacherProArgs {
  email: string;
  /** Length of the grant. Defaults to PRO_GRANT_DEFAULT_DAYS (a year). */
  days?: number;
  /** Personal line from the admin, shown in the email. */
  note?: string | null;
  /** Internal reason (audit only, never emailed). */
  reason?: string | null;
  /** Name to greet by. Falls back to the access-request name, then the profile. */
  fullName?: string | null;
  locale?: TeacherLocale;
  grantedBy: string;
  nowMs?: number;
}

export type GrantTeacherProResult =
  | {
      ok: true;
      grantId: string;
      userId: string | null;
      status: 'active' | 'pending_signup';
      expiresAt: string;
      emailSent: boolean;
      emailError?: string;
      fullName: string;
      email: string;
    }
  | { ok: false; error: 'invalid_email' | 'already_paid' | string };

function resolveAdmin(deps?: Deps): SupabaseClient | null {
  if (deps && 'admin' in deps) return deps.admin ?? null;
  return createAdminClient();
}

export async function grantTeacherPro(args: GrantTeacherProArgs, deps?: Deps): Promise<GrantTeacherProResult> {
  const email = normalizeGrantEmail(args.email);
  if (!email) return { ok: false, error: 'invalid_email' };

  const admin = resolveAdmin(deps);
  if (!admin) return { ok: false, error: 'service role key not configured' };

  const nowMs = args.nowMs ?? Date.now();
  const days = args.days ?? PRO_GRANT_DEFAULT_DAYS;
  let expiresAt: string;
  try {
    expiresAt = proGrantExpiry(nowMs, days);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid duration' };
  }
  const nowIso = new Date(nowMs).toISOString();

  // Email -> user id. SECURITY DEFINER function, execute limited to service_role.
  const lookup = await admin.rpc('find_user_id_by_email', { p_email: email });
  if (lookup.error) return { ok: false, error: `user lookup failed: ${lookup.error.message}` };
  const userId: string | null = (lookup.data as string | null) ?? null;

  if (userId) {
    const { data: existing, error: subErr } = await admin
      .from('subscriptions')
      .select('tier, status, source, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();
    if (subErr) return { ok: false, error: `subscription read failed: ${subErr.message}` };
    // A paying teacher keeps their paid row. Refunds and credits are Polar's job.
    if (isPaidProviderSubscription(existing)) return { ok: false, error: 'already_paid' };
  }

  // Name + locale for the email: explicit > access request > profile > address.
  let fullName = (args.fullName || '').trim();
  let locale: TeacherLocale = args.locale || 'en';
  if (!fullName || !args.locale) {
    const { data: req } = await admin
      .from('teacher_access_requests')
      .select('full_name, locale')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const r = req as { full_name?: string; locale?: TeacherLocale } | null;
    if (!fullName && r?.full_name) fullName = r.full_name;
    if (!args.locale && r?.locale) locale = r.locale;
  }
  if (!fullName && userId) {
    const { data: prof } = await admin
      .from('profiles')
      .select('display_name, username')
      .eq('id', userId)
      .maybeSingle();
    const p = prof as { display_name?: string | null; username?: string | null } | null;
    fullName = (p?.display_name || p?.username || '').trim();
  }
  if (!fullName) fullName = email.split('@')[0];

  const { data: grant, error: grantErr } = await admin
    .from('teacher_pro_grants')
    .insert({
      email,
      user_id: userId,
      granted_by: args.grantedBy,
      days,
      note: args.note?.trim() || null,
      reason: args.reason?.trim() || null,
      full_name: fullName,
      locale,
      starts_at: nowIso,
      expires_at: expiresAt,
      applied_at: userId ? nowIso : null,
    })
    .select('id')
    .single();
  if (grantErr || !grant) return { ok: false, error: `grant insert failed: ${grantErr?.message || 'no row'}` };
  const grantId = (grant as { id: string }).id;

  if (userId) {
    const applied = await applyGrantToUser(admin, { grantId, userId, expiresAt });
    if (applied.error) return { ok: false, error: applied.error };
  }

  const tpl = teacherProGift({ full_name: fullName, locale, note: args.note, expiresAt, pending: !userId });
  let emailSent = false;
  let emailError: string | undefined;
  try {
    const sent = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    emailSent = sent.ok;
    if (!sent.ok) emailError = sent.error || 'send failed';
  } catch (e) {
    emailError = e instanceof Error ? e.message : 'send threw';
  }
  if (emailSent) {
    await admin.from('teacher_pro_grants').update({ email_sent_at: new Date().toISOString() }).eq('id', grantId).select('id');
  }

  return {
    ok: true,
    grantId,
    userId,
    status: userId ? 'active' : 'pending_signup',
    expiresAt,
    emailSent,
    ...(emailError ? { emailError } : {}),
    fullName,
    email,
  };
}

/**
 * Write the entitlement: the `subscriptions` row and the teacher role. Shared by
 * the immediate path (account exists) and the sign-in bridge (claimed later).
 */
async function applyGrantToUser(
  admin: SupabaseClient,
  { grantId, userId, expiresAt }: { grantId: string; userId: string; expiresAt: string },
): Promise<{ error?: string }> {
  const up = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        tier: 'pro',
        status: 'active',
        source: 'admin_grant',
        grant_id: grantId,
        lemon_squeezy_subscription_id: null,
        lemon_squeezy_order_id: null,
        lemon_squeezy_variant_id: null,
        current_period_end: expiresAt,
        cancel_at_period_end: false,
      },
      { onConflict: 'user_id' },
    )
    .select('user_id');
  if (up.error) return { error: `subscription upsert failed: ${up.error.message}` };
  if (!up.data?.length) return { error: 'subscription upsert affected no rows' };

  // Pro implies teacher access. Admins keep their admin role.
  const promoted = await admin
    .from('profiles')
    .update({ user_role: 'teacher' })
    .eq('id', userId)
    .neq('user_role', 'admin')
    .select('id');
  if (promoted.error) return { error: `profile promotion failed: ${promoted.error.message}` };

  return {};
}

export type ApplyPendingResult =
  | { applied: true; grantId: string; expiresAt: string }
  | { applied: false; error?: string };

/**
 * Sign-in bridge: a grant made for an email before that email had an account.
 * Called once per sign-in next to the allowlist bridge. Quiet when nothing is
 * pending; loud (`error`) when a claim fails, because a silent failure here looks
 * identical to "no grant".
 */
export async function applyPendingProGrants(
  { userId, email, nowMs }: { userId: string; email: string; nowMs?: number },
  deps?: Deps,
): Promise<ApplyPendingResult> {
  const normalized = normalizeGrantEmail(email);
  if (!normalized) return { applied: false };
  const admin = resolveAdmin(deps);
  if (!admin) return { applied: false, error: 'service role key not configured' };
  const now = nowMs ?? Date.now();
  const nowIso = new Date(now).toISOString();

  const { data, error } = await admin
    .from('teacher_pro_grants')
    .select('id, email, user_id, expires_at, applied_at, revoked_at')
    .eq('email', normalized)
    .is('applied_at', null)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .order('expires_at', { ascending: false })
    .limit(1);
  if (error) return { applied: false, error: error.message };
  const grant = (data as Array<{ id: string; expires_at: string }> | null)?.[0];
  if (!grant) return { applied: false };

  const { data: existing } = await admin
    .from('subscriptions')
    .select('tier, status, source, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();
  if (!isPaidProviderSubscription(existing)) {
    const applied = await applyGrantToUser(admin, { grantId: grant.id, userId, expiresAt: grant.expires_at });
    if (applied.error) return { applied: false, error: applied.error };
  }

  const stamped = await admin
    .from('teacher_pro_grants')
    .update({ user_id: userId, applied_at: nowIso })
    .eq('id', grant.id)
    .select('id');
  if (stamped.error) return { applied: false, error: stamped.error.message };
  if (!stamped.data?.length) return { applied: false, error: 'grant not marked applied' };

  return { applied: true, grantId: grant.id, expiresAt: grant.expires_at };
}

export async function revokeProGrant(
  { grantId, revokedBy, nowMs }: { grantId: string; revokedBy: string; nowMs?: number },
  deps?: Deps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = resolveAdmin(deps);
  if (!admin) return { ok: false, error: 'service role key not configured' };
  const nowIso = new Date(nowMs ?? Date.now()).toISOString();

  const { data: grant, error } = await admin
    .from('teacher_pro_grants')
    .select('id, user_id, revoked_at')
    .eq('id', grantId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  const g = grant as { id: string; user_id: string | null; revoked_at: string | null } | null;
  if (!g) return { ok: false, error: 'not found' };
  if (g.revoked_at) return { ok: true };

  const stamped = await admin
    .from('teacher_pro_grants')
    .update({ revoked_at: nowIso, revoked_by: revokedBy })
    .eq('id', grantId)
    .select('id');
  if (stamped.error) return { ok: false, error: stamped.error.message };

  if (g.user_id) {
    // Only the row this grant wrote. A paid subscription that has since replaced
    // it carries source='polar' and grant_id=null, and must not be touched.
    const down = await admin
      .from('subscriptions')
      .update({ tier: 'free', status: 'active', current_period_end: null, grant_id: null })
      .eq('user_id', g.user_id)
      .eq('grant_id', grantId)
      .select('user_id');
    if (down.error) return { ok: false, error: down.error.message };
  }
  return { ok: true };
}

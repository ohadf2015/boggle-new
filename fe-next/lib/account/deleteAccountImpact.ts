/**
 * Teacher-aware account deletion — shared server helpers.
 *
 * UR audit (t_b4743600): the only activated classroom teacher deleted her
 * account 6 minutes after the day-2 value email, and the plain delete flow
 * gave her no class-impact warning, no lighter alternative, and then its
 * deleteUser call timed out (504) with no retry. This module holds the pure
 * parts of the fix so the route and its tests share one policy:
 *
 * - Impact summary shape (what the interstitial shows and what telemetry
 *   carries).
 * - `deleteUserWithRetry`: GoTrue admin deletes can 504 while still
 *   succeeding server-side, so a retry must treat "user not found" as a
 *   completed delete, not a failure.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DeleteImpactClassroom {
  id: string;
  name: string | null;
  studentCount: number;
}

/**
 * Billing truth for the "free stays free" card. LexiClash never stores cards;
 * `renews` is the only honest local proxy for "a charge will happen again".
 * portalUrl is not a column on public.subscriptions — null, and the client
 * falls back to /[locale]/teacher/upgrade.
 */
export interface DeleteImpactBilling {
  tier: 'free' | 'pro' | null;
  status: string | null;
  renews: boolean;
  portalUrl: string | null;
}

export const EMPTY_DELETE_BILLING: DeleteImpactBilling = {
  tier: null,
  status: null,
  renews: false,
  portalUrl: null,
};

const RENEWING_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * renews = pro + a provider subscription id + a live status + not already
 * set to cancel. No row, free, canceled, paused, and cancel_at_period_end
 * all come back renews:false. Polar ids live in lemon_squeezy_subscription_id.
 */
export function billingFromSubscriptionRow(row: unknown): DeleteImpactBilling {
  if (!row || typeof row !== 'object') return EMPTY_DELETE_BILLING;
  const r = row as Record<string, unknown>;
  const tier = r.tier === 'pro' || r.tier === 'free' ? r.tier : null;
  const status = typeof r.status === 'string' ? r.status : null;
  const subId = typeof r.lemon_squeezy_subscription_id === 'string' ? r.lemon_squeezy_subscription_id : null;
  const renews =
    tier === 'pro' &&
    subId !== null &&
    subId.length > 0 &&
    status !== null &&
    RENEWING_STATUSES.has(status) &&
    r.cancel_at_period_end !== true;
  return { tier, status, renews, portalUrl: null };
}

export interface DeleteImpactSummary {
  /** True when the user owns at least one classroom — the interstitial trigger. */
  isTeacher: boolean;
  classrooms: DeleteImpactClassroom[];
  totalStudents: number;
  /** Completed live rounds with at least one player — "games played" for copy. */
  roundsPlayed: number;
  /** profiles.daily_email_subscribed — drives the "just stop the emails" alternative. */
  emailSubscribed: boolean;
  billing: DeleteImpactBilling;
  /**
   * True once DELETE /api/education/classroom/[id] and the class-page affordance
   * exist. Card C stays hidden when this is false — never a dead link.
   */
  perClassDeleteAvailable: boolean;
}

export const EMPTY_DELETE_IMPACT: DeleteImpactSummary = {
  isTeacher: false,
  classrooms: [],
  totalStudents: 0,
  roundsPlayed: 0,
  emailSubscribed: true,
  billing: EMPTY_DELETE_BILLING,
  perClassDeleteAvailable: false,
};

type Db = Pick<SupabaseClient, 'from'>;

interface MembershipRow {
  classroom_id: string;
  student_id: string;
  is_rehearsal: boolean | null;
}

/**
 * Classrooms the user teaches, with per-class roster counts and completed
 * rounds. The teacher's own preview seat and rehearsal seats are excluded,
 * matching the roster math in lifecycleNudgeRunner.
 *
 * Throws nothing — a failed impact read must not block account deletion or
 * the interstitial; the caller falls back to EMPTY_DELETE_IMPACT.
 */
export async function loadDeleteImpact(db: Db, userId: string): Promise<DeleteImpactSummary> {
  try {
    const { data: rooms, error: roomsError } = await db
      .from('classrooms')
      .select('id, name')
      .eq('teacher_id', userId);
    if (roomsError) return EMPTY_DELETE_IMPACT;

    const classrooms = (rooms ?? []) as Array<{ id: string; name: string | null }>;
    if (classrooms.length === 0) return EMPTY_DELETE_IMPACT;

    const classroomIds = classrooms.map((c) => c.id);
    const [membersRes, roundsRes, profileRes, subRes] = await Promise.all([
      db
        .from('classroom_memberships')
        .select('classroom_id, student_id, is_rehearsal')
        .in('classroom_id', classroomIds),
      db
        .from('classroom_rounds')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', userId)
        .not('completed_at', 'is', null)
        .gte('player_count', 1),
      db
        .from('profiles')
        .select('daily_email_subscribed')
        .eq('id', userId)
        .maybeSingle(),
      db
        .from('subscriptions')
        .select('tier, status, lemon_squeezy_subscription_id, cancel_at_period_end')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const studentsByClass = new Map<string, number>();
    if (!membersRes.error) {
      for (const m of (membersRes.data ?? []) as MembershipRow[]) {
        if (m.student_id === userId) continue; // teacher preview seat
        if (m.is_rehearsal) continue;
        studentsByClass.set(m.classroom_id, (studentsByClass.get(m.classroom_id) ?? 0) + 1);
      }
    }

    const impact: DeleteImpactSummary = {
      isTeacher: true,
      classrooms: classrooms.map((c) => ({
        id: c.id,
        name: c.name ?? null,
        studentCount: studentsByClass.get(c.id) ?? 0,
      })),
      totalStudents: 0,
      roundsPlayed: roundsRes.error ? 0 : roundsRes.count ?? 0,
      emailSubscribed: profileRes.error
        ? true
        : ((profileRes.data as { daily_email_subscribed: boolean | null } | null)?.daily_email_subscribed ?? true),
      billing: subRes.error ? EMPTY_DELETE_BILLING : billingFromSubscriptionRow(subRes.data),
      // Shipped with DELETE /api/education/classroom/[id] and the [id] page.
      perClassDeleteAvailable: true,
    };
    impact.totalStudents = impact.classrooms.reduce((sum, c) => sum + c.studentCount, 0);
    return impact;
  } catch {
    return EMPTY_DELETE_IMPACT;
  }
}

/** Reasons the delete confirm picker offers. Optional; never blocks deletion. */
export const TEACHER_DELETE_REASONS = [
  'too_expensive',
  'didnt_work_for_class',
  'duplicate_account',
  'privacy',
  'other',
] as const;

export type TeacherDeleteReason = (typeof TEACHER_DELETE_REASONS)[number];

/**
 * Older picker values. Still accepted on the wire so a stale client (and
 * historical events) keep a reason. Not shown in the picker.
 */
const LEGACY_DELETE_REASONS = [
  'too_many_emails',
  'missing_features',
  'not_using_it',
  'found_alternative',
] as const;

export type AcceptedDeleteReason = TeacherDeleteReason | (typeof LEGACY_DELETE_REASONS)[number];

export function normalizeDeleteReason(raw: unknown): AcceptedDeleteReason | null {
  if (typeof raw !== 'string') return null;
  if (raw === 'privacy_concerns') return 'privacy';
  if ((TEACHER_DELETE_REASONS as readonly string[]).includes(raw)) return raw as TeacherDeleteReason;
  if ((LEGACY_DELETE_REASONS as readonly string[]).includes(raw)) return raw as AcceptedDeleteReason;
  return null;
}

/** Plural-aware impact sentence. Nouns are already translated (one|other). */
export function formatTeacherDeleteImpactSummary(
  template: string,
  counts: { classes: number; students: number; rounds: number },
  nouns: { classNoun: string; studentNoun: string; roundNoun: string },
): string {
  return template
    .replace('{classes}', String(counts.classes))
    .replace('{students}', String(counts.students))
    .replace('{rounds}', String(counts.rounds))
    .replace('{classNoun}', nouns.classNoun)
    .replace('{studentNoun}', nouns.studentNoun)
    .replace('{roundNoun}', nouns.roundNoun);
}

export interface AdminDeleteResult {
  error: { message?: string; status?: number; code?: string } | null;
}

export type AdminAuth = {
  auth: {
    admin: {
      deleteUser: (id: string) => Promise<AdminDeleteResult>;
      getUserById?: (id: string) => Promise<{ data: { user: unknown } | null; error: AdminDeleteResult['error'] }>;
    };
  };
};

/** GoTrue says the user is gone — a previous attempt actually deleted them. */
export function isUserNotFoundError(error: AdminDeleteResult['error']): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.status === 404 ||
    error.code === 'user_not_found' ||
    msg.includes('user not found') ||
    msg.includes('not found')
  );
}

/** A timeout/5xx can be retried; a 4xx (other than the not-found above) cannot. */
export function isRetryableDeleteError(error: AdminDeleteResult['error']): boolean {
  if (!error) return false;
  const status = typeof error.status === 'number' ? error.status : 0;
  if (status >= 500) return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'timeout' ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('fetch failed') ||
    msg.includes('aborterror')
  );
}

export interface DeleteUserOutcome {
  ok: boolean;
  /** True when an earlier attempt had already deleted the user. */
  alreadyDeleted: boolean;
  attempts: number;
  error: AdminDeleteResult['error'];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks if the user is actually gone in auth.users via getUserById.
 */
function logUnexpectedUserLookup(
  userId: string,
  detail: { status?: number; code?: string; message?: string },
): void {
  // Conservative: an unexpected lookup failure is not proof the user is gone.
  console.error(
    '[account/delete] getUserById failed unexpectedly; treating the user as still present',
    { userId, ...detail },
  );
}

export async function checkUserActuallyGone(admin: AdminAuth, userId: string): Promise<boolean> {
  if (typeof admin.auth.admin.getUserById !== 'function') return false;
  try {
    const lookup = await admin.auth.admin.getUserById(userId);
    if (lookup?.error && isUserNotFoundError(lookup.error)) {
      return true;
    }
    if (!lookup?.data?.user && !lookup?.error) {
      return true;
    }
    if (lookup?.error) {
      logUnexpectedUserLookup(userId, {
        status: lookup.error.status,
        code: lookup.error.code,
        message: lookup.error.message,
      });
    }
    return false;
  } catch (err) {
    if (err instanceof Error && isUserNotFoundError({ message: err.message })) {
      return true;
    }
    logUnexpectedUserLookup(userId, {
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Invokes admin.deleteUser bounded by an AbortController timeout (default 10s).
 */
export async function deleteUserWithTimeout(
  admin: AdminAuth,
  userId: string,
  timeoutMs: number = 10000,
): Promise<AdminDeleteResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const deletePromise = admin.auth.admin.deleteUser(userId);
    const timeoutPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        const err = new Error(`deleteUser timed out after ${timeoutMs / 1000}s`);
        err.name = 'AbortError';
        reject(err);
      });
    });

    return await Promise.race([deletePromise, timeoutPromise]);
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.toLowerCase().includes('timed out'));
    return {
      error: {
        message: err instanceof Error ? err.message : String(err),
        status: isTimeout ? 504 : 500,
        code: isTimeout ? 'timeout' : undefined,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * deleteUser with timeout-safety (10s AbortController), bounded retry on timeout/5xx,
 * and idempotency on user-not-found / getUserById verification.
 * If the deleteUser call times out or returns 5xx, we inspect whether the user is
 * actually gone before declaring failure.
 */
export async function deleteUserWithRetry(
  admin: AdminAuth,
  userId: string,
  {
    maxAttempts = 2,
    retryDelayMs = 750,
    timeoutMs = 10000,
  }: { maxAttempts?: number; retryDelayMs?: number; timeoutMs?: number } = {},
): Promise<DeleteUserOutcome> {
  let lastError: AdminDeleteResult['error'] = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await deleteUserWithTimeout(admin, userId, timeoutMs);

    if (!result.error) return { ok: true, alreadyDeleted: false, attempts: attempt, error: null };

    lastError = result.error;
    if (isUserNotFoundError(result.error)) {
      // Already gone — a prior attempt (this call's or an earlier request's)
      // completed the delete. That IS the success signal.
      return { ok: true, alreadyDeleted: true, attempts: attempt, error: null };
    }

    // On timeout or 5xx, check if user was actually deleted despite the error
    if (isRetryableDeleteError(result.error)) {
      const gone = await checkUserActuallyGone(admin, userId);
      if (gone) {
        return { ok: true, alreadyDeleted: true, attempts: attempt, error: null };
      }
    }

    if (!isRetryableDeleteError(result.error) || attempt === maxAttempts) break;
    await sleep(retryDelayMs);
  }

  // Final check before reporting failure: if error was retryable, check if user is gone
  if (isRetryableDeleteError(lastError)) {
    const gone = await checkUserActuallyGone(admin, userId);
    if (gone) {
      return { ok: true, alreadyDeleted: true, attempts: maxAttempts, error: null };
    }
  }

  return { ok: false, alreadyDeleted: false, attempts: maxAttempts, error: lastError };
}

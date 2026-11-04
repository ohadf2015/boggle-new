/**
 * Snapshot for `growth:account_deleted`.
 *
 * Fired by DELETE /api/account/delete BEFORE auth.admin.deleteUser, so a
 * timeout or 5xx still leaves a Growth Radar row. Properties are an allowlist:
 * no email, name, classroom name, or other free text.
 *
 * Queries (all service-role, all best-effort — a failed read becomes null/0,
 * never a thrown error, never a skipped event):
 *
 * - role: profiles.user_role for this user.
 * - signup_surface: profiles.signup_surface (first-touch attribution). The
 *   route may fill a gap from auth user_metadata.signup_surface when the
 *   column is still null.
 * - classes / members: the delete-impact snapshot (classrooms owned by the
 *   user; roster excludes the teacher preview seat and rehearsal seats, same
 *   math as the interstitial).
 * - rounds: count of classroom_rounds rows whose classroom_id is one of those
 *   classes. Not the completed-with-players subset the interstitial shows.
 * - last_round_age_hours: hours since the later of started_at and completed_at
 *   on the classroom_rounds row with the latest completed_at among those
 *   classes. Null when that set is empty (the user never played a class round).
 * - utm_campaign: utm_campaign of the most recent email landing. A landing is
 *   an analytics_events row (created_at) or a linked guest_sessions row
 *   (last_visit_at) whose utm_source or utm_medium is `email`. The newer
 *   non-null campaign wins. If neither table has one, profiles.utm_campaign
 *   is used only when that stored attribution is itself an email landing.
 * - account_age_hours: whole hours since auth.users.created_at (the signup).
 * - reason: normalized client reason picker value; null when the body omitted it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EduServerEvent } from '@/backend/utils/educationTelemetry';
import type { DeleteImpactSummary } from './deleteAccountImpact';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Attribution tokens we will put on an event. Rejects emails and free-text names. */
const SAFE_TOKEN = /^[A-Za-z0-9_-]{1,200}$/;

export interface AccountDeletedFacts {
  role: string | null;
  signupSurface: string | null;
  utmCampaign: string | null;
  rounds: number;
  /** ISO timestamp the age is measured from, or null if the user never played. */
  lastRoundAt: string | null;
}

export const EMPTY_ACCOUNT_DELETED_FACTS: AccountDeletedFacts = {
  role: null,
  signupSurface: null,
  utmCampaign: null,
  rounds: 0,
  lastRoundAt: null,
};

type Db = Pick<SupabaseClient, 'from'>;

interface QueryResult {
  data: unknown;
  error: { message?: string } | null;
  count?: number | null;
}

export function hoursSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now - t) / HOUR_MS));
}

/** Keep enum-like tokens. An email or a person's name must not ride this event. */
export function scrubToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!SAFE_TOKEN.test(v)) return null;
  return v;
}

function isEmailAttr(source: unknown, medium: unknown): boolean {
  const src = typeof source === 'string' ? source.trim().toLowerCase() : '';
  const med = typeof medium === 'string' ? medium.trim().toLowerCase() : '';
  return src === 'email' || med === 'email';
}

function rowOf<T>(res: QueryResult | null | undefined): T | null {
  if (!res || res.error || res.data == null) return null;
  return res.data as T;
}

function countOf(res: QueryResult | null | undefined): number {
  if (!res || res.error || typeof res.count !== 'number') return 0;
  return res.count;
}

function laterIso(a: string | null | undefined, b: string | null | undefined): string | null {
  const at = a ? Date.parse(a) : NaN;
  const bt = b ? Date.parse(b) : NaN;
  if (!Number.isFinite(at) && !Number.isFinite(bt)) return null;
  if (!Number.isFinite(at)) return b ?? null;
  if (!Number.isFinite(bt)) return a ?? null;
  return at >= bt ? a! : b!;
}

interface ProfileAttr {
  user_role: string | null;
  signup_surface: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

interface LandingRow {
  utm_campaign: string | null;
  created_at?: string | null;
  last_visit_at?: string | null;
}

function campaignAt(row: LandingRow | null, stamp: 'created_at' | 'last_visit_at'): { at: number; campaign: string } | null {
  const campaign = scrubToken(row?.utm_campaign);
  if (!campaign || !row) return null;
  const at = Date.parse(row[stamp] ?? '');
  return { campaign, at: Number.isFinite(at) ? at : 0 };
}

/**
 * Read the delete-event facts. Never throws. classroomIds are the classes
 * this user owns (already loaded by loadDeleteImpact).
 */
export async function loadAccountDeletedFacts(
  db: Db,
  userId: string,
  classroomIds: string[],
): Promise<AccountDeletedFacts> {
  try {
    const profileQ = db
      .from('profiles')
      .select('user_role, signup_surface, utm_source, utm_medium, utm_campaign')
      .eq('id', userId)
      .maybeSingle();

    const roundsQ = classroomIds.length
      ? db
          .from('classroom_rounds')
          .select('id', { count: 'exact', head: true })
          .in('classroom_id', classroomIds)
      : Promise.resolve({ data: null, error: null, count: 0 } satisfies QueryResult);

    const lastRoundQ = classroomIds.length
      ? db
          .from('classroom_rounds')
          .select('started_at, completed_at')
          .in('classroom_id', classroomIds)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } satisfies QueryResult);

    // `.or` keeps the filter in the database so we never pull a non-email row
    // (and never select metadata, which can hold a display name).
    const emailOr = 'utm_source.eq.email,utm_medium.eq.email';
    const analyticsQ = db
      .from('analytics_events')
      .select('utm_campaign, created_at')
      .eq('player_id', userId)
      .or(emailOr)
      .not('utm_campaign', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const guestQ = db
      .from('guest_sessions')
      .select('utm_campaign, last_visit_at')
      .eq('user_id', userId)
      .or(emailOr)
      .not('utm_campaign', 'is', null)
      .order('last_visit_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const [profileRes, roundsRes, lastRes, analyticsRes, guestRes] = await Promise.all([
      profileQ,
      roundsQ,
      lastRoundQ,
      analyticsQ,
      guestQ,
    ]);

    const profile = rowOf<ProfileAttr>(profileRes as QueryResult);
    const last = rowOf<{ started_at: string | null; completed_at: string | null }>(lastRes as QueryResult);
    const landings = [
      campaignAt(rowOf<LandingRow>(analyticsRes as QueryResult), 'created_at'),
      campaignAt(rowOf<LandingRow>(guestRes as QueryResult), 'last_visit_at'),
    ].filter((c): c is { at: number; campaign: string } => c !== null);
    landings.sort((a, b) => b.at - a.at);

    let utmCampaign = landings[0]?.campaign ?? null;
    if (!utmCampaign && profile && isEmailAttr(profile.utm_source, profile.utm_medium)) {
      utmCampaign = scrubToken(profile.utm_campaign);
    }

    return {
      role: scrubToken(profile?.user_role),
      signupSurface: scrubToken(profile?.signup_surface),
      utmCampaign,
      rounds: classroomIds.length ? countOf(roundsRes as QueryResult) : 0,
      lastRoundAt: last ? laterIso(last.started_at, last.completed_at) : null,
    };
  } catch {
    return EMPTY_ACCOUNT_DELETED_FACTS;
  }
}

export function buildAccountDeletedEvent(input: {
  userId: string;
  createdAt: string | null | undefined;
  now?: number;
  reason: string | null;
  impact: DeleteImpactSummary;
  facts: AccountDeletedFacts;
}): EduServerEvent {
  const now = input.now ?? Date.now();
  const createdMs = input.createdAt ? Date.parse(input.createdAt) : NaN;
  const accountAgeDays = Number.isFinite(createdMs)
    ? Math.max(0, Math.floor((now - createdMs) / DAY_MS))
    : 0;
  const reason = scrubToken(input.reason);

  // Allowlist. Adding a key here is the only way it reaches PostHog.
  const properties: Record<string, unknown> = {
    role: scrubToken(input.facts.role),
    account_age_hours: hoursSince(input.createdAt, now),
    classes: input.impact.classrooms.length,
    members: input.impact.totalStudents,
    rounds: input.facts.rounds,
    last_round_age_hours: input.facts.rounds > 0 ? hoursSince(input.facts.lastRoundAt, now) : null,
    signup_surface: scrubToken(input.facts.signupSurface),
    utm_campaign: scrubToken(input.facts.utmCampaign),
    reason,
    is_teacher: input.impact.isTeacher,
    class_count: input.impact.classrooms.length,
    student_count: input.impact.totalStudents,
    deletion_reason: reason,
    account_age_days: accountAgeDays,
  };

  return {
    distinctId: input.userId,
    event: 'growth:account_deleted',
    properties,
  };
}

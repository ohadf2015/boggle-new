/**
 * Decide what /api/auth/attribution writes and whether this request is the
 * account's one growth:signup_completed (t_9eb9ad5f + t_b6131f7d).
 *
 * First writer of each column wins. The event fires when this request is
 * the first writer of signup_surface (Google and same-browser email), and
 * also on the email catch-up: the trigger already stamped signup_surface
 * from options.data, so the column is non-null, but no event has been sent.
 * Catch-up only runs when user_metadata.signup_surface was stashed by the
 * new email signup path — old accounts must not be backfilled into today's
 * funnel. Deduped by user_metadata.signup_completed_emitted.
 */

export const SIGNUP_EVENT_FLAG = 'signup_completed_emitted';

export interface AttributionProfile {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
  signup_surface?: string | null;
  language?: string | null;
  country_code?: string | null;
  user_role?: string | null;
  is_test_account?: boolean | null;
}

export interface SignupUser {
  app_metadata?: { provider?: string | null } | null;
  identities?: Array<{ provider?: string | null }> | null;
  user_metadata?: Record<string, unknown> | null;
}

export interface AttributionDecision {
  update: Record<string, string>;
  emit: boolean;
  source: string | null;
  method: 'email' | 'google';
}

export function signupMethod(user: SignupUser | null | undefined): 'email' | 'google' {
  if (user?.app_metadata?.provider === 'google') return 'google';
  if (user?.identities?.some((id) => id.provider === 'google')) return 'google';
  return 'email';
}

export function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = meta?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function emailSignupNeedsCatchup(user: SignupUser | null | undefined): boolean {
  if (!user || user.app_metadata?.provider !== 'email') return false;
  if (user.user_metadata?.[SIGNUP_EVENT_FLAG] === true) return false;
  return metaString(user.user_metadata, 'signup_surface') !== null;
}

export function decideAttributionWrite(args: {
  profile: AttributionProfile;
  incoming: Record<string, string | null | undefined>;
  user: SignupUser;
}): AttributionDecision {
  const { profile, incoming, user } = args;
  const method = signupMethod(user);
  const update: Record<string, string> = {};
  for (const [column, value] of Object.entries(incoming)) {
    if (!value) continue;
    const current = (profile as Record<string, unknown>)[column];
    if (current === null || current === undefined) update[column] = value;
  }

  const metaRole = metaString(user.user_metadata, 'intended_role');
  const role = profile.user_role ?? null;
  if (metaRole === 'teacher' && role !== 'teacher' && role !== 'admin') {
    update.user_role = 'teacher';
  }

  const alreadyEmitted = user.user_metadata?.[SIGNUP_EVENT_FLAG] === true;
  const stashedSurface = metaString(user.user_metadata, 'signup_surface');
  const wroteSurface = Boolean(update.signup_surface);
  const catchup =
    !alreadyEmitted &&
    !wroteSurface &&
    method === 'email' &&
    Boolean(stashedSurface) &&
    Boolean(profile.signup_surface);
  const emit = wroteSurface || catchup;
  const source = update.signup_surface || profile.signup_surface || stashedSurface || null;

  return { update, emit, source, method };
}

/** CDN / proxy country on the confirm request. XX and T1 are not countries. */
export function countryFromRequestHeaders(request: { headers: { get(name: string): string | null } }): string | null {
  const names = ['x-country-code', 'cf-ipcountry', 'x-vercel-ip-country', 'cloudfront-viewer-country'];
  for (const name of names) {
    const raw = request.headers.get(name);
    if (!raw) continue;
    const code = raw.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code) && code !== 'XX' && code !== 'T1') return code;
  }
  return null;
}

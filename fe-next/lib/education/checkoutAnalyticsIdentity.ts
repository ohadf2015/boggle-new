import type { EduServerEvent } from '@/backend/utils/educationTelemetry';

export interface BrowserCookieIdentity {
  distinctId: string;
  sessionId: string | null;
  userState: string | null;
}

export interface CheckoutAnalyticsIdentity {
  distinctId: string;
  sessionId: string | null;
  source: 'browser_cookie' | 'user_id' | 'polar_metadata';
}

const PH_COOKIE = /^ph_.+_posthog$/;
const COOKIELESS_SENTINEL = '$posthog_cookieless';
const MAX_ID_LENGTH = 200;
const SESSION_ID = /^[A-Za-z0-9-]{1,64}$/;
// Supabase user ids are v4; posthog-js anonymous ids are v7. A v4 id in the cookie is a forged account id.
const ACCOUNT_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function usableId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  if (!id || id.length > MAX_ID_LENGTH || id === COOKIELESS_SENTINEL) return null;
  return id;
}

/** The posthog-js persistence cookie (`ph_<token>_posthog`, URI-encoded JSON) from a Cookie header. */
export function readPosthogCookieIdentity(cookieHeader: string | null | undefined): BrowserCookieIdentity | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!PH_COOKIE.test(name)) continue;
    try {
      const parsed = JSON.parse(decodeURIComponent(part.slice(eq + 1).trim())) as Record<string, unknown>;
      const distinctId = usableId(parsed.distinct_id);
      if (!distinctId) continue;
      const rawSesid = Array.isArray(parsed.$sesid) ? parsed.$sesid[1] : null;
      const sesid = typeof rawSesid === 'string' && SESSION_ID.test(rawSesid) ? rawSesid : null;
      const userState = typeof parsed.$user_state === 'string' ? parsed.$user_state : null;
      return { distinctId, sessionId: sesid, userState };
    } catch {
      continue;
    }
  }
  return null;
}

/** The cookie is client-written: never trust it to name another account, and on a shared PC it can be someone else's. */
export function resolveCheckoutAnalyticsIdentity(args: {
  userId: string;
  cookieHeader: string | null | undefined;
}): CheckoutAnalyticsIdentity {
  const cookie = readPosthogCookieIdentity(args.cookieHeader);
  const anonymous = cookie?.userState === 'anonymous' && !ACCOUNT_ID_SHAPE.test(cookie.distinctId);
  if (cookie && (anonymous || cookie.distinctId === args.userId)) {
    return { distinctId: cookie.distinctId, sessionId: cookie.sessionId, source: 'browser_cookie' };
  }
  return { distinctId: args.userId, sessionId: null, source: 'user_id' };
}

export function withAnalyticsIdentity(
  event: EduServerEvent,
  identity: CheckoutAnalyticsIdentity,
  userId: string,
): EduServerEvent {
  return {
    ...event,
    distinctId: identity.distinctId,
    properties: {
      ...event.properties,
      teacher_id: userId,
      user_id: userId,
      analytics_identity_source: identity.source,
      ...(identity.sessionId ? { $session_id: identity.sessionId } : {}),
    },
  };
}

export function withPolarMetadataIdentity(
  event: EduServerEvent,
  metadata: Record<string, unknown> | null | undefined,
  userId: string | null | undefined,
): EduServerEvent {
  const distinctId = usableId(metadata?.posthog_distinct_id);
  if (!userId || !distinctId || (distinctId !== userId && ACCOUNT_ID_SHAPE.test(distinctId))) return event;
  return withAnalyticsIdentity(event, { distinctId, sessionId: null, source: 'polar_metadata' }, userId);
}

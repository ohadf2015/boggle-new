/**
 * Auth helper for Bearer-token API routes (client sends
 * `Authorization: Bearer <jwt>`, no cookie session).
 *
 * Fast path: local HS256 JWT verify (sub-ms, no network) when
 * SUPABASE_JWT_SECRET is configured and the token is valid.
 *
 * Fallback: remote `supabase.auth.getUser(token)` — used only when local
 * verify misses (secret not provisioned, or token signed with a different
 * secret). This keeps behavior identical to the old inline `getUserFromRequest`
 * helpers, so there is NO regression while the secret is absent, and NO 401
 * outage if the provisioned secret turns out not to match — the worst case
 * degrades to today's behavior, not an auth failure.
 *
 * Why this exists: the old per-request `createClient()` + network
 * `auth.getUser(token)` round-trip on every call timed out Railway's proxy and
 * produced the churn-signals 502s (Sentry JAVASCRIPT-NEXTJS-1KQ, 276 events).
 * Provision SUPABASE_JWT_SECRET (Supabase → Project Settings → API → JWT Secret)
 * and the legit-token hot path stops touching the network entirely.
 */
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { verifyJwtLocal, bearerToken, type LocalUser } from './verifyJwt';

// Canary throttle: when SUPABASE_JWT_SECRET is entirely absent, EVERY bearer call
// takes the uncapped remote-auth round-trip that hangs Railway's proxy — the real
// root of the churn-signals 502s (JAVASCRIPT-NEXTJS-1KQ). The client beacon no
// longer alarms on those 502s, so this is the signal that the provisioned secret
// has dropped. Throttle to one warning per window so a missing secret doesn't
// itself become a Sentry flood.
const SECRET_MISSING_WARN_INTERVAL_MS = 5 * 60_000;
let lastSecretMissingWarnAt = 0;

function warnSecretMissingThrottled(): void {
  const now = Date.now();
  if (now - lastSecretMissingWarnAt < SECRET_MISSING_WARN_INTERVAL_MS) return;
  lastSecretMissingWarnAt = now;
  Sentry.captureMessage(
    '[auth] SUPABASE_JWT_SECRET missing — bearer auth on uncapped remote-fallback path (502/perf risk)',
    'warning',
  );
}

export async function getBearerUser(req: Request): Promise<LocalUser | null> {
  const token = bearerToken(req);
  if (!token) return null;

  // Fast path: local verify, no network.
  const local = await verifyJwtLocal(token);
  if (local) return local;

  // Local verify missed. If the secret is entirely unset that's the systemic
  // regression (not a per-token mismatch) — alarm it, throttled.
  if (!process.env.SUPABASE_JWT_SECRET) {
    warnSecretMissingThrottled();
  }

  // Fallback: remote token verify (legacy behavior). Reached when the secret is
  // unset or the token didn't verify locally.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? undefined,
    role: user.role,
  };
}

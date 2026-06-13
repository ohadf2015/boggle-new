/**
 * variantCookie — client-side persistence of an already-resolved experiment
 * variant.
 *
 * Why: the homepage cube grid (and every other `useExperiment` consumer) is
 * gated behind a CLIENT-side PostHog flag that takes ~8s to resolve in
 * production. Until it resolves the page shows `control`, so the cube layout —
 * and its `/modes/cubes/*.png` images — only mount ~8s in. By persisting the
 * variant the client already resolved to a cookie, the NEXT render/visit can
 * seed the hook's initial state synchronously and paint the bucketed variant
 * immediately (cube images fetch at ~hydration instead of ~8s).
 *
 * Consent-safe: this only REPLAYS a variant the client legitimately resolved
 * (via PostHog after consent, or an email override). It never EVALUATES flags,
 * so it respects `opt_out_capturing_by_default` — a first-time / non-consented
 * visitor has no cookie and correctly stays on the default variant.
 */

import { isValidVariant, type ExperimentKey } from '@/lib/experiments';

const COOKIE_PREFIX = 'exp_';
// 30 days — long enough to keep repeat visits fast, short enough that a user
// re-buckets within a sprint if the rollout changes.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function variantCookieName(key: ExperimentKey): string {
  return `${COOKIE_PREFIX}${key}`;
}

/** Read a single raw cookie value by exact name (client-only). */
function readRawCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${name}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return undefined;
}

/**
 * Read the persisted variant for an experiment. Returns `undefined` on the
 * server, when no cookie is set, or when the stored value is not a known
 * variant for this key (defends against stale/forged cookies after the
 * registry changes).
 */
export function readVariantCookie(key: ExperimentKey): string | undefined {
  const raw = readRawCookie(variantCookieName(key));
  if (raw === undefined) return undefined;
  return isValidVariant(key, raw) ? raw : undefined;
}

/**
 * Persist a resolved variant (client-only). No-ops on the server and skips the
 * write when the cookie already holds this value (avoids needless churn on
 * every render).
 */
export function persistVariant(key: ExperimentKey, variant: string): void {
  if (typeof document === 'undefined') return;
  const name = variantCookieName(key);
  if (readRawCookie(name) === variant) return;
  document.cookie = `${name}=${encodeURIComponent(variant)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

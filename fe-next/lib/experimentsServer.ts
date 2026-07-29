/**
 * Server-side experiment variant evaluator.
 *
 * Use from API routes / Server Components / server actions when the
 * server needs to make a variant-dependent decision (reward amount,
 * content selection, payload shape, etc).
 *
 * Pass the SAME distinctId you use for `posthog.identify()` on the
 * client (Supabase user UUID for authed users, anon ID forwarded
 * from a client cookie/header for guests). Mismatched IDs cause the
 * user to be in different variants on client vs server — bad data.
 *
 * All failure modes (no PostHog key, empty distinctId, network error,
 * unknown variant) collapse to the registry default. Server requests
 * must never fail because PostHog had a bad day.
 */

import { getPostHogServer } from './posthog';
import {
  EXPERIMENTS,
  experimentDefault,
  isValidVariant,
  type ExperimentKey,
  type ExperimentVariant,
} from './experiments';

export async function getServerExperimentVariant<K extends ExperimentKey>(
  key: K,
  distinctId: string,
): Promise<ExperimentVariant<K>> {
  const fallback = experimentDefault(key);

  // No distinctId → no stable assignment possible. Return default.
  if (!distinctId) return fallback;

  const ph = getPostHogServer();
  if (!ph) return fallback;

  try {
    const raw = await ph.getFeatureFlag(key, distinctId);
    return isValidVariant(key, raw) ? raw : fallback;
  } catch {
    // Never let a flag-evaluation network blip break the request path.
    return fallback;
  }
}

/**
 * Bulk read multiple experiments in one call. Use when an API route
 * needs to consult several flags for the same user.
 */
export async function getServerExperimentVariants<K extends ExperimentKey>(
  keys: readonly K[],
  distinctId: string,
): Promise<{ [P in K]: ExperimentVariant<P> }> {
  const entries = await Promise.all(
    keys.map(async (k) => [k, await getServerExperimentVariant(k, distinctId)] as const),
  );
  const out = {} as { [P in K]: ExperimentVariant<P> };
  for (const [k, v] of entries) {
    (out as Record<K, ExperimentVariant<K>>)[k] = v as ExperimentVariant<K>;
  }
  return out;
}

/** Re-export for convenience so callers don't need two imports. */
export { EXPERIMENTS, type ExperimentKey, type ExperimentVariant };

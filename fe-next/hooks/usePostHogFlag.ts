/**
 * usePostHogFlag — Typed wrapper around PostHog feature flags.
 *
 * Returns the flag variant string (for multivariate flags) or boolean.
 * Falls back to `defaultValue` when PostHog is not initialized or
 * the user hasn't consented to analytics.
 */

import { useEffect, useState } from 'react';
import posthog from '@/lib/analytics/lazyPosthog';

export function usePostHogFlag<T extends string | boolean = string>(
  flagKey: string,
  defaultValue: T,
  /**
   * Optional client-resolved seed — e.g. a variant persisted from a prior visit
   * (see `variantCookie`). Applied in the mount effect (NOT the useState
   * initializer) so the first render still matches the server's `defaultValue`:
   * seeding the initializer would render a different variant than SSR and trip
   * an App Router hydration mismatch. Applying it post-commit re-renders the
   * bucketed variant within one render cycle — still ~hydration, far ahead of
   * the ~8s async flag fetch — with no mismatch. A live PostHog value (read
   * just below) still overrides it.
   */
  initialValue?: T
): T {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    // Seed from the prior-resolved value immediately (synchronous, no network).
    if (initialValue !== undefined) setValue(initialValue);

    // PostHog may not be initialized (no key, no consent)
    if (typeof posthog?.getFeatureFlag !== 'function') return;

    // Get current value
    const current = posthog.getFeatureFlag(flagKey);
    if (current !== undefined && current !== null) {
      setValue(current as T);
    }

    // Listen for flag changes (e.g. after identify or remote config update)
    let cancelled = false;
    const handler = () => {
      if (cancelled) return;
      const updated = posthog.getFeatureFlag(flagKey);
      if (updated !== undefined && updated !== null) {
        setValue(updated as T);
      }
    };

    posthog.onFeatureFlags(handler);

    return () => { cancelled = true; };
  }, [flagKey, initialValue]);

  return value;
}

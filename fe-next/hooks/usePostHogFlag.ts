/**
 * usePostHogFlag — Typed wrapper around PostHog feature flags.
 *
 * Returns the flag variant string (for multivariate flags) or boolean.
 * Falls back to `defaultValue` when PostHog is not initialized or
 * the user hasn't consented to analytics.
 */

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';

export function usePostHogFlag<T extends string | boolean = string>(
  flagKey: string,
  defaultValue: T
): T {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
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
  }, [flagKey]);

  return value;
}

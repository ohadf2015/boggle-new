/**
 * useExperiment — typed PostHog A/B experiment hook.
 *
 * Wraps `usePostHogFlag` with the central registry so call sites get
 * compile-time variant safety + auto-applied defaults.
 *
 * Usage:
 *   const { variant, trackExposure } = useExperiment('signup-prompt-cta-copy');
 *   useEffect(() => { trackExposure(); }, [trackExposure]);  // fire when UI renders
 *
 *   if (variant === 'urgency')   return <UrgencyCTA />;
 *   if (variant === 'value-prop') return <ValuePropCTA />;
 *   return <ControlCTA />;
 *
 * Why a separate `trackExposure()` instead of the implicit
 * `$feature_flag_called` PostHog already fires:
 *   - PostHog's auto-event fires the moment `getFeatureFlag` is read,
 *     which happens on every render — including renders where the
 *     variant UI isn't actually shown (route changed, condition
 *     short-circuited above the experiment, etc).
 *   - For unbiased conversion stats we want exposure counted only
 *     when the variant *actually rendered*. Caller fires explicitly.
 *   - As a guardrail, we skip exposure when the variant equals the
 *     registry default (covers "SDK not loaded yet" / "no consent")
 *     so unassigned users don't pollute the control bucket.
 */

import { useCallback, useRef } from 'react';
import posthog from 'posthog-js';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import {
  experimentDefault,
  experimentEmailOverride,
  isValidVariant,
  type ExperimentKey,
  type ExperimentVariant,
} from '@/lib/experiments';

export interface UseExperimentResult<K extends ExperimentKey> {
  readonly variant: ExperimentVariant<K>;
  /** Fire `experiment_exposed` once per hook lifetime. No-op if variant is the default. */
  readonly trackExposure: () => void;
}

export function useExperiment<K extends ExperimentKey>(
  key: K,
): UseExperimentResult<K> {
  const fallback = experimentDefault(key);
  const raw = usePostHogFlag<string>(key, fallback);

  // Defensive: if PostHog returns a variant we don't know about,
  // collapse to the default rather than ship undefined behaviour.
  const liveVariant: ExperimentVariant<K> = isValidVariant(key, raw)
    ? raw
    : fallback;

  // Per-email forced override (registry allowlist). Reads identified email
  // from PostHog `$set` props (populated by identifyUserForAnalytics on auth).
  // Wins over the remote variant so single-user pilots don't need a cohort.
  let identifiedEmail: string | null = null;
  try {
    const getProp = (posthog as unknown as { get_property?: (k: string) => unknown }).get_property;
    const value = typeof getProp === 'function' ? getProp.call(posthog, 'email') : undefined;
    identifiedEmail = typeof value === 'string' ? value : null;
  } catch {
    identifiedEmail = null;
  }
  const override = experimentEmailOverride(key, identifiedEmail);
  const variant: ExperimentVariant<K> = override ?? liveVariant;

  const fired = useRef(false);
  const trackExposure = useCallback(() => {
    if (fired.current) return;
    if (variant === fallback) return; // user not really assigned yet
    fired.current = true;
    try {
      (posthog.capture as (event: string, props?: Record<string, unknown>) => void)(
        'experiment_exposed',
        { experiment: key, variant },
      );
    } catch {
      // PostHog not loaded — silent no-op
    }
  }, [key, variant, fallback]);

  return { variant, trackExposure };
}

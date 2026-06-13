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

import { useCallback, useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import { readVariantCookie, persistVariant } from '@/lib/experiments/variantCookie';
import { useAuth } from '@/contexts/AuthContext';
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
  // Seed the first render from a variant the client resolved on a prior visit
  // (cookie). Without this the variant stays `fallback` until PostHog resolves
  // (~8s in prod), so layout-driving experiments (e.g. the homepage cube grid)
  // paint control first and swap late — delaying their images. Returns
  // undefined on the server / first-ever visit → unchanged default behaviour.
  const seeded = readVariantCookie(key);
  const raw = usePostHogFlag<string>(key, fallback, seeded);

  // Defensive: if PostHog returns a variant we don't know about,
  // collapse to the default rather than ship undefined behaviour.
  const liveVariant: ExperimentVariant<K> = isValidVariant(key, raw)
    ? raw
    : fallback;

  // Per-email forced override (registry allowlist). Reads email straight
  // from AuthContext — synchronous and provider-safe (useAuth returns a
  // default value outside the provider, so this is SSR/test friendly).
  // Wins over the remote variant so single-user pilots don't need a cohort.
  const { user } = useAuth();
  const override = experimentEmailOverride(key, user?.email ?? null);
  const variant: ExperimentVariant<K> = override ?? liveVariant;

  // Persist a real (non-default) variant so the next render/visit can seed it
  // synchronously above. Only non-default values are stored: an unassigned user
  // (variant === fallback) must NOT get pinned to control, or they'd never
  // re-bucket once the rollout ramps. persistVariant is a client-only no-op on
  // the server and skips redundant writes.
  useEffect(() => {
    if (variant !== fallback) persistVariant(key, variant);
  }, [key, variant, fallback]);

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

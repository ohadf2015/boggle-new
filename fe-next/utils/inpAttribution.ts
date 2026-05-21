/**
 * INP attribution instrumentation.
 *
 * PostHog's bundled web-vitals only reports the INP *value* — not *why* it was
 * slow. This module adds the standalone `web-vitals/attribution` build's `onINP`
 * listener and captures a custom `web_vitals_inp_attribution` event carrying:
 *   - the interaction target selector (which element the user tapped),
 *   - the inputDelay / processingDuration / presentationDelay split
 *     (main-thread-busy vs. heavy-handler vs. slow-paint), and
 *   - the longest intersecting LoAF script (source URL + duration).
 *
 * Field investigation (2026-05-21) found MP classic has the worst mobile INP of
 * any mode (p75 312ms / p90 488ms across 30 sessions). The drag path is already
 * optimized, so attribution is needed to name the real culprit before further
 * refactoring. See docs/2026-05-21-mp-classic-frontend-perf-investigation.md.
 */

import posthog from 'posthog-js';

/** Minimal structural shape of a web-vitals INP metric with attribution. */
export interface InpMetricLike {
  value: number;
  rating: string;
  navigationType?: string;
  attribution: {
    interactionTarget: string;
    interactionType: 'pointer' | 'keyboard';
    inputDelay: number;
    processingDuration: number;
    presentationDelay: number;
    loadState: string;
    longestScript?: {
      entry: { sourceURL?: string; duration?: number };
      subpart: string;
    };
  };
}

/**
 * Bucket a pathname into a game-mode family — mirrors the route classification
 * used in the PostHog `$web_vitals` analysis so the two datasets line up. Order
 * matters: more specific matches first.
 */
export function classifyRoute(pathname: string): string {
  const p = pathname.toLowerCase();
  if (p.includes('multiplayer')) return 'multiplayer';
  if (p.includes('word-hunt')) return 'word-hunt';
  if (p.includes('word-craft')) return 'word-craft';
  if (p.includes('word-tower')) return 'word-tower';
  if (p.includes('practice')) return 'practice';
  if (p.includes('blast')) return 'blast';
  if (p.includes('daily')) return 'daily';
  return 'other';
}

/** Flatten an INP metric + attribution into queryable PostHog properties. */
export function buildInpAttributionPayload(
  metric: InpMetricLike,
  pathname: string,
): Record<string, unknown> {
  const a = metric.attribution;
  return {
    inp_value: metric.value,
    inp_rating: metric.rating,
    navigation_type: metric.navigationType,
    interaction_target: a.interactionTarget,
    interaction_type: a.interactionType,
    input_delay: a.inputDelay,
    processing_duration: a.processingDuration,
    presentation_delay: a.presentationDelay,
    load_state: a.loadState,
    route_family: classifyRoute(pathname),
    pathname,
    longest_script_url: a.longestScript?.entry?.sourceURL,
    longest_script_duration: a.longestScript?.entry?.duration,
    longest_script_subpart: a.longestScript?.subpart,
  };
}

/**
 * Subscribe to finalized INP and forward attribution to PostHog. Capture is a
 * no-op while the user is opted out (GDPR), so no extra consent gate is needed.
 * web-vitals is dynamically imported so it code-splits out of the main bundle
 * and only loads client-side after mount.
 *
 * @returns an uninstall function (matches the provider's tracker convention).
 */
export function installInpAttributionTracker(): () => void {
  if (typeof window === 'undefined') return () => {};
  let cancelled = false;
  void import('web-vitals/attribution')
    .then(({ onINP }) => {
      if (cancelled) return;
      onINP((metric) => {
        try {
          posthog.capture(
            'web_vitals_inp_attribution',
            buildInpAttributionPayload(metric as unknown as InpMetricLike, window.location.pathname),
          );
        } catch {
          /* never let instrumentation throw into the app */
        }
      });
    })
    .catch(() => {
      /* web-vitals failed to load — non-fatal, instrumentation simply absent */
    });
  return () => {
    cancelled = true;
  };
}

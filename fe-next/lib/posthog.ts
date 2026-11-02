/**
 * Server-side PostHog client singleton
 *
 * For use in Server Components, API routes, and server actions.
 * Configured with flushAt: 1 and flushInterval: 0 because
 * serverless functions are short-lived and can't batch events.
 *
 * KEY RESOLUTION: NEXT_PUBLIC_POSTHOG_KEY is the canonical name (it is the
 * project key, safe to expose). The fallbacks exist because prod has
 * historically carried the key under other names (POSTHOG_API_KEY is the
 * build-time personal key for source-map upload — wrong type for capture, but
 * if it is the ONLY name present, a misrouted capture that 401s loudly in the
 * transport log still beats a client that silently returns null). No key at
 * all is a LOUD error, once per process: a silent null here is what made the
 * Teacher Pro return step invisible (brain P0 38ac1a51).
 */

import { PostHog } from 'posthog-node';

let posthogInstance: PostHog | null = null;
let missingKeyLogged = false;

function resolveServerKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    process.env.POSTHOG_PROJECT_KEY ||
    process.env.POSTHOG_API_KEY ||
    undefined
  );
}

export function getPostHogServer(): PostHog | null {
  const key = resolveServerKey();
  if (!key) {
    if (!missingKeyLogged) {
      missingKeyLogged = true;
       
      console.error(
        '[posthog-server] No PostHog key configured (looked for NEXT_PUBLIC_POSTHOG_KEY, ' +
          'POSTHOG_PROJECT_KEY, POSTHOG_API_KEY) — every server-side capture is being DROPPED. ' +
          'Education funnel events (checkout_return_landed et al.) never reach PostHog in this state.',
      );
    }
    return null;
  }

  if (!posthogInstance) {
    posthogInstance = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogInstance;
}

/** @internal test-only reset of the singleton + the loud-error latch. */
export function _resetPostHogServer(): void {
  posthogInstance = null;
  missingKeyLogged = false;
}

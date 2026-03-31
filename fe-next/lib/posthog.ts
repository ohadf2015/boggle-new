/**
 * Server-side PostHog client singleton
 *
 * For use in Server Components, API routes, and server actions.
 * Configured with flushAt: 1 and flushInterval: 0 because
 * serverless functions are short-lived and can't batch events.
 */

import { PostHog } from 'posthog-node';

let posthogInstance: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!posthogInstance) {
    posthogInstance = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogInstance;
}

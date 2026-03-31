'use client';

/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog with consent gating via the existing cookie consent system.
 * - Starts opted-out by default (GDPR compliant)
 * - Opts in only when analytics consent is granted
 * - Dynamically responds to consent changes
 * - Tracks page views on route changes (manual, not autocapture)
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { hasConsent, onConsentChange } from '@/utils/cookieConsent';

let posthogInitialized = false;

/** @internal Reset init flag for testing only */
export function _resetPostHogInit() {
  posthogInitialized = false;
}

function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || posthogInitialized) return;

  posthogInitialized = true;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    opt_out_capturing_by_default: true,
    capture_pageview: false, // We track manually on route change
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      // Opt in immediately if consent already granted
      if (hasConsent('analytics') && ph.has_opted_out_capturing()) {
        ph.opt_in_capturing();
      }
    },
  });
}

/** Tracks page views on Next.js route changes */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthogInitialized) return;

    const url = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();

    // Check consent on mount
    if (hasConsent('analytics') && posthog.has_opted_out_capturing()) {
      posthog.opt_in_capturing();
    }

    // React to consent changes
    const unsubscribe = onConsentChange((state) => {
      if (state.analytics) {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
      }
    });

    return unsubscribe;
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}

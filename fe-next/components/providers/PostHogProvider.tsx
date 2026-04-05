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

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { onConsentChange } from '@/utils/cookieConsent';

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
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    opt_out_capturing_by_default: false,
    capture_pageview: false, // We track manually on route change
    capture_pageleave: true,
    capture_exceptions: true, // Capture unhandled JS errors and promise rejections
    persistence: 'localStorage+cookie',
    loaded: () => {
      // PostHog starts capturing by default; user can opt out via cookie banner
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

    // React to consent changes — opt out only if user explicitly declines
    const unsubscribe = onConsentChange((state) => {
      if (!state.analytics) {
        posthog.opt_out_capturing();
      } else if (posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing();
      }
    });

    return unsubscribe;
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}

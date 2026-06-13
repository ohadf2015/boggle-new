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
// Lazy proxy — NO static `posthog-js` import. The lib is dynamic-import()ed on
// first init() below, so its ~374KB stays out of the shared-commons chunk that
// would otherwise ship on every route. See lib/analytics/lazyPosthog.ts.
import posthog from '@/lib/analytics/lazyPosthog';
import type { PostHog } from 'posthog-js';
import { onConsentChange, hasConsent } from '@/utils/cookieConsent';
import {
  setPostHogSuperProps,
  setPostHogSuperPropsOnce,
  installTabVisibilityTracker,
  detectPlatform,
} from '@/utils/posthogEngagement';
import { filterEmptyException } from '@/utils/posthogExceptionFilter';
import { installAbandonOnPagehide } from '@/utils/abandonOnPagehide';
import { installInpAttributionTracker } from '@/utils/inpAttribution';

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
    // GDPR: start opted-out. We only opt in after the user grants analytics
    // consent via the cookie banner (or if their stored consent already allows it).
    opt_out_capturing_by_default: true,
    capture_pageview: false, // We track manually on route change
    capture_pageleave: true,
    capture_exceptions: true, // Capture unhandled JS errors and promise rejections
    // Enable Web-Vitals ATTRIBUTION so $web_vitals events carry the LCP element
    // (tag/id/class). Without it the nightly perf-watch sees an LCP number but no
    // element, so a homepage-LCP regression can't be targeted without guessing
    // (the 2026-06-03 /en LCP spike had an unknown LCP element for exactly this).
    capture_performance: { web_vitals: true, web_vitals_attribution: true },
    before_send: filterEmptyException,
    persistence: 'localStorage+cookie',
    loaded: (ph: PostHog) => {
      // If the user has already granted analytics consent in a prior session,
      // opt in immediately so this session is tracked.
      if (hasConsent('analytics')) {
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

    let platformRecheckId: ReturnType<typeof setTimeout> | null = null;

    // Register super properties attached to every event — lets you slice
    // any funnel / cohort by locale + RTL + platform in PostHog without joins.
    if (typeof document !== 'undefined') {
      const htmlLang = document.documentElement.lang || 'en';
      const isRtl = document.documentElement.dir === 'rtl';
      const platform = detectPlatform();
      setPostHogSuperProps({
        locale: htmlLang,
        is_rtl: isRtl,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        touch: 'ontouchstart' in window,
        platform,
      });
      setPostHogSuperPropsOnce({
        first_locale: htmlLang,
        first_touch: 'ontouchstart' in window,
        first_platform: platform,
      });

      // CG SDK detection is async — re-register `platform` after a short delay
      // so events fired pre-detection are properly tagged.
      platformRecheckId = setTimeout(() => {
        const updated = detectPlatform();
        if (updated !== platform) setPostHogSuperProps({ platform: updated });
      }, 2_000);
    }

    // Tab-visibility tracker — attention time is a core engagement metric.
    const uninstallVisibility = installTabVisibilityTracker();

    // Pagehide-driven game abandon — without this the "Game Abandoned" goal
    // sees zero conversions because players close the tab rather than tap quit.
    const uninstallAbandon = installAbandonOnPagehide();

    // INP attribution — names which interaction/screen is slow (MP classic has
    // the worst mobile INP). Captures `web_vitals_inp_attribution`.
    const uninstallInp = installInpAttributionTracker();

    // React to consent changes — opt out only if user explicitly declines
    const unsubscribe = onConsentChange((state) => {
      if (!state.analytics) {
        posthog.opt_out_capturing();
      } else if (posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing();
      }
    });

    return () => {
      if (platformRecheckId) clearTimeout(platformRecheckId);
      uninstallVisibility();
      uninstallAbandon();
      uninstallInp();
      unsubscribe();
    };
  }, []);

  // No PHProvider/React-context wrapper: nothing consumes the posthog React
  // context (all flag hooks read the singleton via usePostHogFlag), so wrapping
  // would only force a static `posthog-js/react` import back into the bundle.
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import {
  EngagementScript,
  ENGAGEMENT_EVENTS,
  ENGAGEMENT_FALLBACK_MS,
} from '@/components/EngagementScript';
import { isHeavyGamePath } from '@/lib/perf/heavyGamePath';
import { isLandingPath } from '@/lib/i18n/isLandingPath';

const GA4_SRC = 'https://www.googletagmanager.com/gtag/js?id=G-7VLG16BJQH';

/** Pointer-only: PSI/Lighthouse scroll must not pull gtag into the LCP window. */
const GAME_ENGAGEMENT_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

/**
 * GA4 loader. On fullscreen game routes AND the mobile PSI landing (`/` / `/en`)
 * the 3s bounce fallback and scroll listener were enough for PageSpeed to
 * download gtag.js (~155KiB br / ~450KiB parsed) during LCP — the same weight
 * class as the deleted AdSense show_ads_impl. Those routes wait for a real
 * key/pointer instead. Nested content routes keep the bounce fallback so GA4
 * still counts non-engaging pageviews.
 */
export function LocaleGtagLoader() {
  const pathname = usePathname();
  const deferForPsi = isHeavyGamePath(pathname) || isLandingPath(pathname);
  return (
    <EngagementScript
      src={GA4_SRC}
      fallbackMs={deferForPsi ? null : ENGAGEMENT_FALLBACK_MS}
      events={deferForPsi ? GAME_ENGAGEMENT_EVENTS : ENGAGEMENT_EVENTS}
    />
  );
}

export default LocaleGtagLoader;

'use client';

import { usePathname } from 'next/navigation';
import {
  EngagementScript,
  ENGAGEMENT_EVENTS,
  ENGAGEMENT_FALLBACK_MS,
} from '@/components/EngagementScript';
import { isHeavyGamePath } from '@/lib/perf/heavyGamePath';

const GA4_SRC = 'https://www.googletagmanager.com/gtag/js?id=G-7VLG16BJQH';

/** Pointer-only: PSI/Lighthouse scroll must not pull gtag into the LCP window. */
const GAME_ENGAGEMENT_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

/**
 * GA4 loader. On fullscreen game routes the 3s bounce fallback and scroll
 * listener were enough for PageSpeed to download gtag.js (~155KiB) during
 * LCP. Game routes wait for a real key/pointer instead.
 */
export function LocaleGtagLoader() {
  const pathname = usePathname();
  const game = isHeavyGamePath(pathname);
  return (
    <EngagementScript
      src={GA4_SRC}
      fallbackMs={game ? null : ENGAGEMENT_FALLBACK_MS}
      events={game ? GAME_ENGAGEMENT_EVENTS : ENGAGEMENT_EVENTS}
    />
  );
}

export default LocaleGtagLoader;

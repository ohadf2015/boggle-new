'use client';

/**
 * Cookie consent for routes that skip SiteExtras.
 *
 * Heavy game paths (/singleplayer and the other fullscreen shells) never
 * render DeferredLayoutWidgets, so the consent bar that lives there was
 * absent for the whole visit — including after the overlay quiet zone
 * cleared. This mount is the missing half of that gate.
 *
 * Visibility is NOT decided here. CookieConsent already hides itself while
 * a modal owns the screen or the quiet zone is up, and it picks the student
 * dense variant from the pathname. A chunk failure stays inside
 * ChunkErrorBoundary so it cannot blank the game.
 *
 * ssr:false keeps CookieConsent out of the /singleplayer entry parse — the
 * same constraint that put SiteExtras behind next/dynamic.
 */

import nextDynamic from 'next/dynamic';
import ChunkErrorBoundary from '@/components/ChunkErrorBoundary';

const CookieConsent = nextDynamic(() => import('@/components/CookieConsent'), {
  ssr: false,
  loading: () => null,
});

export default function HeavyPathCookieConsent() {
  return (
    <ChunkErrorBoundary>
      <CookieConsent />
    </ChunkErrorBoundary>
  );
}

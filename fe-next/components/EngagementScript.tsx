'use client';

import { useEffect } from 'react';
import { runWhenScrollSettles } from '@/lib/perf/runWhenScrollSettles';

/** First-engagement signals. pointermove covers desktop visitors who only read. */
export const ENGAGEMENT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * Visitors who never engage (bounces) still get the script after this delay, so
 * GA4 keeps counting their pageview. ponytail: fixed delay; a visitor who leaves
 * sooner without touching the page is not counted (same as before lazyOnload fired).
 *
 * Pass `fallbackMs={null}` on fullscreen game routes so PageSpeed's idle wait
 * cannot pull gtag.js into the LCP window.
 */
export const ENGAGEMENT_FALLBACK_MS = 3000;

interface EngagementScriptProps {
  src: string;
  fallbackMs?: number | null;
  events?: readonly string[];
}

/**
 * Loads a third-party script on the visitor's first engagement (or after
 * ENGAGEMENT_FALLBACK_MS) instead of with the page. Used for GA4's gtag.js (~155KB br / ~450KB parsed), which even as
 * `lazyOnload` downloaded and compiled inside the first-load window.
 *
 * Queue-safe: GoogleConsentMode defines `window.gtag` + `dataLayer` inline, so
 * gtag() calls made before this script arrives wait in dataLayer and replay when
 * it loads. Consent logic is untouched; this only moves the download.
 * Renders nothing. Guarded by components/__tests__/fresh.perf.EngagementScript.test.tsx.
 */
export function EngagementScript({
  src,
  fallbackMs = ENGAGEMENT_FALLBACK_MS,
  events = ENGAGEMENT_EVENTS,
}: EngagementScriptProps) {
  useEffect(() => {
    const opts = { capture: true, passive: true } as const;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelPending: (() => void) | undefined;
    const detach = () => {
      clearTimeout(timer);
      for (const type of events) window.removeEventListener(type, onEngage, opts);
    };
    function onEngage() {
      detach();
      cancelPending ??= runWhenScrollSettles(inject);
    }
    function inject() {
      detach();
      if (document.querySelector(`script[src="${src}"]`)) return;
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
    for (const type of events) window.addEventListener(type, onEngage, opts);
    if (fallbackMs != null) {
      timer = setTimeout(onEngage, fallbackMs);
    }
    return () => {
      detach();
      cancelPending?.();
    };
  }, [src, fallbackMs, events]);

  return null;
}

export default EngagementScript;

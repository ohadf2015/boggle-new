'use client';

import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense';

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

interface AdUnitProps {
  /** AdSense ad slot ID (assigned after approval, use placeholder until then) */
  adSlot: string;
  /** Fixed width in pixels — omit for responsive */
  width?: number;
  /** Fixed height in pixels — omit for responsive */
  height?: number;
  /** Extra CSS class on the wrapper */
  className?: string;
}

/**
 * Returns true when the page is served from a dev/local origin
 * where AdSense should NOT render (avoids console errors + policy issues).
 */
function isDevHost(): boolean {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0';
}

/**
 * Renders a real Google AdSense `<ins>` display ad.
 *
 * - Responsive (format=auto) by default; pass width+height for fixed sizes.
 * - Skips rendering on localhost / SSR (matches GoogleAdSense.tsx pattern).
 * - Calls `adsbygoogle.push({})` once after mount to activate the slot.
 */
export const AdUnit: React.FC<AdUnitProps> = ({ adSlot, width, height, className }) => {
  const { t } = useLanguage();
  const pushed = useRef(false);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isDevHost() || pushed.current) return;

    // Wait until the container has a non-zero width before pushing the ad.
    // AdSense throws "No slot size for availableWidth=0" if pushed too early.
    const tryPush = () => {
      const el = containerRef.current;
      if (!el || el.offsetWidth === 0) return false;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
        return true;
      } catch {
        return false;
      }
    };

    if (tryPush()) return;

    // Retry with requestAnimationFrame until container is visible
    let retries = 0;
    const maxRetries = 20; // ~330ms at 60fps
    const raf = () => {
      if (pushed.current || retries >= maxRetries) return;
      retries++;
      if (!tryPush()) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, []);

  if (isDevHost()) return null;

  const isFixed = width != null && height != null;

  return (
    <aside
      ref={containerRef}
      className={cn('ad-unit flex justify-center', className)}
      aria-label={t('ads.label')}
      role="complementary"
    >
      <ins
        className="adsbygoogle"
        style={isFixed
          ? { display: 'inline-block', width: `${width}px`, height: `${height}px` }
          : { display: 'block' }
        }
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={adSlot}
        {...(!isFixed && {
          'data-ad-format': 'auto',
          'data-full-width-responsive': 'true',
        })}
      />
    </aside>
  );
};

export default AdUnit;

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { ConnectionsLandingCopy } from '@/app/[locale]/connections/content';
import { trackLandingCtaClick } from '@/lib/connections/landingTelemetry';

interface Props {
  locale: string;
  label: string;
  // Footer CTA copy reused for accessibility on small screens
  copy: ConnectionsLandingCopy;
}

/**
 * Mobile-only sticky play pill. Fixed above the bottom AdMob banner via the
 * existing `--bottom-stack-height` token (memory: admob-banner-clearance-4019).
 * Hides itself when the game element is in viewport — observer on
 * #connections-game.
 */
export default function ConnectionsStickyCTA({ locale, label }: Props): React.JSX.Element | null {
  const [hidden, setHidden] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const target = document.getElementById('connections-game');
    if (!target) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target.id === 'connections-game') {
            setHidden(e.isIntersecting);
          }
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(target);
    observerRef.current = obs;
    return () => {
      obs.disconnect();
      observerRef.current = null;
    };
  }, []);

  const handleClick = useCallback(() => {
    trackLandingCtaClick({ locale, position: 'sticky' });
  }, [locale]);

  if (hidden) return null;

  return (
    <div
      data-testid="connections-sticky-cta"
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 md:hidden"
      style={{ bottom: 'calc(var(--bottom-stack-height, 0px) + 12px)' }}
    >
      <Link
        href={`/${locale}/connections#connections-game`}
        onClick={handleClick}
        className="pointer-events-auto inline-flex items-center justify-center rounded-neo border-4 border-neo-pink bg-neo-pink px-6 py-3 font-neo-display text-base font-black uppercase tracking-wide text-neo-white shadow-hard-lg"
      >
        {label}
      </Link>
    </div>
  );
}

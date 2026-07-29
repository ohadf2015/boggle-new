'use client';

import React, { useCallback } from 'react';
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
 * Routes to the dedicated /play sub-route — game no longer embedded in landing.
 */
export default function ConnectionsStickyCTA({ locale, label }: Props): React.JSX.Element {
  const handleClick = useCallback(() => {
    trackLandingCtaClick({ locale, position: 'sticky' });
  }, [locale]);

  return (
    <div
      data-testid="connections-sticky-cta"
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 md:hidden"
      style={{ bottom: 'calc(var(--bottom-stack-height, 0px) + 12px)' }}
    >
      <Link
        href={`/${locale}/connections/play`}
        onClick={handleClick}
        className="pointer-events-auto inline-flex items-center justify-center rounded-neo border-4 border-neo-pink bg-neo-pink px-6 py-3 font-neo-display text-base font-black uppercase tracking-wide text-neo-white shadow-hard-lg"
      >
        {label}
      </Link>
    </div>
  );
}

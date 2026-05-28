'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import type { ConnectionsLandingCopy } from '@/app/[locale]/connections/content';
import { trackLandingCtaClick } from '@/lib/connections/landingTelemetry';

interface Props {
  locale: string;
  copy: ConnectionsLandingCopy['footerCta'];
}

export default function ConnectionsFooterCTA({ locale, copy }: Props): React.JSX.Element {
  const handleClick = useCallback(() => {
    trackLandingCtaClick({ locale, position: 'footer' });
  }, [locale]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="rounded-neo border-3 border-neo-black bg-neo-pink p-6 text-center shadow-hard-lg sm:p-10">
        <h2 className="mb-2 font-neo-display text-2xl font-black text-neo-white sm:text-3xl">
          {copy.heading}
        </h2>
        <p className="mb-6 text-base text-neo-white">{copy.body}</p>
        <Link
          href={`/${locale}/connections/play`}
          onClick={handleClick}
          data-testid="footer-cta-button"
          className="inline-block rounded-neo border-4 border-neo-black bg-neo-navy px-8 py-4 font-neo-display text-base font-black uppercase tracking-widest text-neo-white shadow-hard transition-all hover:translate-y-[-2px] hover:shadow-hard-lg"
        >
          {copy.button}
        </Link>
      </div>
    </section>
  );
}

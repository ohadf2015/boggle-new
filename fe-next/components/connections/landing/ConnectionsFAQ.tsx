'use client';

import React, { useCallback } from 'react';
import type { ConnectionsLandingCopy } from '@/app/[locale]/connections/content';
import { trackLandingFaqOpen } from '@/lib/connections/landingTelemetry';

interface Props {
  locale: string;
  copy: ConnectionsLandingCopy['faq'];
}

export default function ConnectionsFAQ({ locale, copy }: Props): React.JSX.Element {
  const onToggle = useCallback(
    (idx: number) => (event: React.SyntheticEvent<HTMLDetailsElement>) => {
      if ((event.currentTarget as HTMLDetailsElement).open) {
        trackLandingFaqOpen({ locale, questionIndex: idx });
      }
    },
    [locale]
  );

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="mb-6 font-neo-display text-2xl font-black sm:text-3xl">{copy.heading}</h2>
      <div className="space-y-3">
        {copy.items.map((entry, idx) => (
          <details
            key={entry.q}
            onToggle={onToggle(idx)}
            className="group rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-neo-display text-base font-black text-neo-white">
              <span>{entry.q}</span>
              <span
                aria-hidden
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-lime font-black text-neo-navy transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-neo-gray-200">{entry.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

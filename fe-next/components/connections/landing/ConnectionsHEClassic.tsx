import React from 'react';
import Image from 'next/image';
import type { ConnectionsLandingCopy } from '@/app/[locale]/connections/content';

interface Props {
  copy: NonNullable<ConnectionsLandingCopy['heClassic']>;
}

export default function ConnectionsHEClassic({ copy }: Props): React.JSX.Element {
  return (
    <section
      dir="rtl"
      className="mx-auto my-8 max-w-4xl px-4 sm:px-6 lg:px-8"
      data-testid="connections-he-classic"
    >
      <div className="rounded-neo border-3 border-neo-black bg-neo-purple-dark p-5 shadow-hard sm:p-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard sm:h-40 sm:w-40">
            <Image
              src="/mascot/celebration.webp"
              alt={copy.imageAlt}
              fill
              sizes="(min-width: 640px) 160px, 128px"
              className="object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex-1 text-center sm:text-start">
            <span className="mb-2 inline-block rotate-[2deg] rounded-neo border-2 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard-sm">
              {copy.badge}
            </span>
            <h2 className="mb-3 font-neo-display text-2xl font-black text-neo-white sm:text-3xl">
              {copy.title}
            </h2>
            <p className="text-base leading-relaxed text-neo-white">{copy.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

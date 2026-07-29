'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import type { ConnectionsLandingCopy } from '@/app/[locale]/connections/content';
import {
  trackLandingCtaClick,
  trackLandingSampleRevealed,
} from '@/lib/connections/landingTelemetry';

interface Props {
  locale: string;
  copy: ConnectionsLandingCopy;
}

export default function ConnectionsHero({ locale, copy }: Props): React.JSX.Element {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    trackLandingSampleRevealed({ locale, position: 'hero' });
  }, [locale, revealed]);

  const handlePrimary = useCallback(() => {
    trackLandingCtaClick({ locale, position: 'hero' });
  }, [locale]);

  const { puzzle } = copy.demo;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <span className="mb-4 inline-block rotate-[-2deg] rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
        {copy.badge}
      </span>

      <h1 className="mb-4 font-neo-display text-4xl font-black leading-tight sm:text-5xl">
        {copy.h1Pre}
        <br />
        <span className="bg-neo-pink px-3 text-neo-white shadow-hard inline-block rotate-[-1deg]">
          {copy.h1Highlight}
        </span>
      </h1>
      <p className="mb-8 text-base text-neo-gray-200 sm:text-lg">{copy.h1Sub}</p>

      {/* Interactive demo */}
      <div
        aria-label={copy.demo.label}
        className="mb-6 rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard sm:p-6"
      >
        <div className="mb-3 text-center font-neo-body text-xs uppercase tracking-widest text-neo-gray-300">
          {copy.demo.label}
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <DemoTile word={puzzle.word1} />
          <span className="font-neo-display text-2xl font-black text-neo-gray-300">+</span>

          <button
            type="button"
            onClick={handleReveal}
            disabled={revealed}
            className={`relative h-14 min-w-[6rem] rounded-neo border-3 border-neo-black px-3 font-neo-display text-lg font-black uppercase shadow-hard transition-all sm:h-16 sm:min-w-[7rem] sm:text-xl ${
              revealed
                ? 'bg-neo-lime text-neo-navy animate-neo-pop motion-reduce:animate-none'
                : 'bg-neo-cream text-neo-navy hover:translate-y-[1px] hover:shadow-hard-pressed'
            }`}
            aria-live="polite"
          >
            {revealed ? puzzle.bridge : '???'}
          </button>

          <span className="font-neo-display text-2xl font-black text-neo-gray-300">+</span>
          <DemoTile word={puzzle.word2} />
        </div>

        {revealed ? (
          <p className="mt-4 text-center font-neo-display text-sm font-bold text-neo-lime">
            ✓ {copy.demo.success}
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-neo-gray-300">{copy.demo.reveal}</p>
        )}
      </div>

      <p className="mb-4 text-base leading-relaxed text-neo-gray-200 sm:text-lg">{copy.introP1}</p>
      <p className="mb-8 text-base leading-relaxed text-neo-gray-200 sm:text-lg">{copy.introP2}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/${locale}/connections/play`}
          onClick={handlePrimary}
          data-testid="hero-cta-primary"
          className="inline-block rounded-neo border-4 border-neo-pink bg-neo-pink px-8 py-4 text-center font-neo-display font-black uppercase tracking-wide text-neo-white shadow-hard transition-all hover:shadow-hard-lg"
        >
          {copy.ctaPrimary}
        </Link>
        <a
          href="#how-it-works"
          className="inline-block rounded-neo border-4 border-neo-cyan bg-transparent px-8 py-4 text-center font-neo-display font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10"
        >
          {copy.ctaSecondary}
        </a>
      </div>
    </section>
  );
}

function DemoTile({ word }: { word: string }): React.JSX.Element {
  return (
    <span className="inline-flex h-14 min-w-[6rem] items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cyan px-3 font-neo-display text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard sm:h-16 sm:min-w-[7rem] sm:text-xl">
      {word}
    </span>
  );
}

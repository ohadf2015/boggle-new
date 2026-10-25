'use client';

import type { CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FreshCrossLink } from './fresh/FreshCrossLink';
import { ApalabradosSinDescargarLink } from '@/components/seo/ApalabradosSinDescargarLink';
import { BoggleAppFreeLink } from '@/components/seo/BoggleAppFreeLink';
import { contentByLocale, type LandingSEOContent } from './landingSEOContent';
import s from './fresh/FreshMotion.module.css';
import b from './fresh/FreshBoard.module.css';

/**
 * How to Play: the homepage's authored SEO copy as a real section (homepage
 * gauntlet, round 6). Rounds 2-5 set it as ever-quieter fine print and the
 * critic kept reading the tail as an "SEO content dump", so it now speaks the
 * page's own language instead:
 *
 * - A section-scale headline (sections 2-6), and the what-is answer as the
 *   section's line. "What is LexiClash?" stays in the HTML as an sr-only
 *   heading (SPEC §9): set as a bold question over a paragraph it read as a
 *   second FAQ. The locale's cross-link (en/es/sv) closes the line.
 * - The four steps are board cells, each led by a numbered letter tile in its
 *   mode colour: a column on phones, 2x2 at sm, a row at md. The tiles pop in
 *   order (FreshMotion, after the page's 9s hold, motion-safe).
 * - Nothing folds: the FAQ keeps the page's one accordion.
 *
 * Plain markup on purpose: SSR'd (crawlers read it, LandingView.ssr.test) and
 * visible at rest. ModeShowcase / WhoPlays / community stay folded into the
 * fresh page's Modes and Languages sections.
 */

interface StepArt {
  accent: 'lime' | 'pink' | 'cyan' | 'purple';
  /** Literal class strings (Tailwind v4 only generates what it can read). */
  tile: string;
}

const STEP_ART: StepArt[] = [
  { accent: 'lime', tile: 'bg-neo-lime -rotate-3' },
  { accent: 'pink', tile: 'bg-neo-pink rotate-2' },
  { accent: 'cyan', tile: 'bg-neo-cyan -rotate-2' },
  { accent: 'purple', tile: 'bg-neo-purple rotate-3' },
];

interface LandingSEOSectionProps {
  className?: string;
}

export function LandingSEOSection({ className }: LandingSEOSectionProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const c: LandingSEOContent = contentByLocale[locale] || contentByLocale.en;

  return (
    <section
      data-home-tail="seo"
      aria-labelledby="home-how-title"
      className={cn('relative z-20 flex w-full flex-col gap-10 md:gap-14', className)}
    >
      <span
        data-home-how-sticker
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -top-6 end-0 hidden aspect-square w-32 bg-[url(/mascot/victory-nobg.webp)] bg-contain bg-center bg-no-repeat drop-shadow-[4px_4px_0_rgb(0_0_0)] sm:block md:-top-10 md:end-6 md:w-44',
          b.sticker
        )}
      />
      <div className="flex max-w-2xl flex-col gap-4 sm:pe-36 md:pe-0">
        <h2
          id="home-how-title"
          className="font-neo-poster text-[1.75rem] font-extrabold leading-[1.08] tracking-[-0.01em] text-neo-cream text-balance [overflow-wrap:anywhere] sm:text-4xl md:text-5xl"
        >
          {c.howToPlayTitle}
        </h2>
        {/* The what-is answer is the section line; its question heading is
            for screen readers and crawlers only (fresh.shell.r6.howToPlay). */}
        <div data-home-whatis className="max-w-[46ch] leading-relaxed">
          <h3 className="sr-only">{c.whatIsTitle}</h3>
          <p className="inline font-neo-body text-base leading-relaxed text-neo-cream/80 md:text-lg">
            {c.whatIsShort}
          </p>{' '}
          <FreshCrossLink
            locale={locale}
            className="whitespace-nowrap font-neo-body text-base font-bold text-neo-cream underline decoration-neo-lime decoration-2 underline-offset-4 transition-colors hover:text-neo-lime focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-lime md:text-lg"
          />
        </div>
        {locale === 'es' ? (
          <ApalabradosSinDescargarLink className="max-w-[46ch] font-neo-body text-base leading-relaxed text-neo-cream/80 md:text-lg" />
        ) : null}
        {locale === 'en' ? (
          <BoggleAppFreeLink
            lead="Skip the install:"
            className="max-w-[46ch] font-neo-body text-base leading-relaxed text-neo-cream/80 md:text-lg"
          />
        ) : null}
      </div>

      <div data-step-path className="relative">
        <ol className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-5">
          {c.steps.map((step, i) => {
            const art = STEP_ART[i % STEP_ART.length];
            return (
              <li
                key={step}
                className="group flex items-center gap-4 rounded-neo-xl border-2 border-neo-cream/40 bg-neo-navy-light p-4 md:flex-col md:items-start md:gap-5 md:p-5"
              >
                <span
                  data-step-art={art.accent}
                  aria-hidden="true"
                  style={{ '--step': i } as CSSProperties}
                  className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-neo-lg border-3 border-neo-black font-neo-poster text-3xl font-extrabold tabular-nums text-neo-black shadow-hard-lg md:h-16 md:w-16 md:text-4xl',
                    'motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-0 motion-safe:group-active:translate-y-0.5',
                    art.tile,
                    s.stepPop
                  )}
                >
                  {i + 1}
                </span>
                <span className="font-neo-body text-base font-bold leading-snug text-neo-cream text-balance md:text-lg">
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

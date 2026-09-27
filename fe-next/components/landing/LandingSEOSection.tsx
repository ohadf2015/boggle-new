'use client';

import type { CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import { Spline, Trophy, Users, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FreshCrossLink } from './fresh/FreshCrossLink';
import { contentByLocale, type LandingSEOContent } from './landingSEOContent';
import s from './fresh/FreshMotion.module.css';

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
 * - The four steps are the hero's tiles (colored fill, black border, hard
 *   shadow) strung on a lime trace path: a column on phones, a row at md.
 *   The tiles pop along the path in order (FreshMotion, after the page's 9s
 *   hold, motion-safe); hover/press only straighten and lift them.
 * - Nothing folds: the FAQ keeps the page's one accordion.
 *
 * Plain markup on purpose: SSR'd (crawlers read it, LandingView.ssr.test) and
 * visible at rest. ModeShowcase / WhoPlays / community stay folded into the
 * fresh page's Modes and Languages sections.
 */

interface StepArt {
  accent: 'lime' | 'pink' | 'cyan' | 'purple';
  icon: LucideIcon;
  /** Literal class strings (Tailwind v4 only generates what it can read). */
  tile: string;
}

const STEP_ART: StepArt[] = [
  { accent: 'lime', icon: Users, tile: 'bg-neo-lime -rotate-3' },
  { accent: 'pink', icon: Spline, tile: 'bg-neo-pink rotate-2' },
  { accent: 'cyan', icon: Zap, tile: 'bg-neo-cyan -rotate-2' },
  { accent: 'purple', icon: Trophy, tile: 'bg-neo-purple rotate-3' },
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
      <div className="flex max-w-2xl flex-col gap-4">
        <h2
          id="home-how-title"
          className="font-neo-display text-3xl font-bold leading-[1.08] text-neo-cream text-balance sm:text-4xl md:text-5xl"
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
      </div>

      <div data-step-path className="relative">
        {/* The lime trace through the tile centers: down a column on phones
            (tiles are 56px, so centers sit 28px in), across a row at md. */}
        <span
          data-step-rail
          aria-hidden="true"
          className="absolute bottom-7 start-[25px] top-7 w-1.5 rounded-full bg-neo-lime md:bottom-auto md:end-[12.5%] md:start-[12.5%] md:top-[29px] md:h-1.5 md:w-auto"
        />
        <ol className="relative grid grid-cols-1 gap-5 md:grid-cols-4 md:gap-6">
          {c.steps.map((step, i) => {
            const art = STEP_ART[i % STEP_ART.length];
            const Icon = art.icon;
            return (
              <li
                key={step}
                className="group flex items-center gap-4 md:flex-col md:gap-5 md:text-center"
              >
                <span
                  data-step-art={art.accent}
                  aria-hidden="true"
                  style={{ '--step': i } as CSSProperties}
                  className={cn(
                    'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-neo-lg border-3 border-neo-black text-neo-black shadow-hard-lg md:h-16 md:w-16',
                    'motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-0 motion-safe:group-active:translate-y-0.5',
                    art.tile,
                    s.stepPop
                  )}
                >
                  <Icon className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2.5} />
                  <span className="absolute -end-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-neo-black bg-neo-cream font-neo-display text-xs font-bold tabular-nums text-neo-black">
                    {i + 1}
                  </span>
                </span>
                <span className="font-neo-body text-base font-bold leading-snug text-neo-cream text-balance md:max-w-[16ch]">
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

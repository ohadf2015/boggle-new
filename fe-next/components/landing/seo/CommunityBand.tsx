'use client';

import Link from 'next/link';
import { Instagram, ArrowRight } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Mascot } from '@/components/ui/Mascot';
import { cn } from '@/lib/utils';

/**
 * Community Band — the belonging beat. Surfaces the (previously unused)
 * `communityStats` + community copy as one drenched, full-width lime block:
 * giant inline numbers, a "you're joining thousands" line, a real Play CTA, and
 * the mascot celebrating at the edge. This is the section that turns "a website"
 * into "a place with people in it". Static SSR content.
 */

export interface CommunityStat {
  value: string;
  label: string;
}

interface CommunityBandProps {
  heading: string;
  body: string;
  stats: CommunityStat[];
  ctaLabel: string;
  ctaHref: string;
  instagramHandle: string;
  className?: string;
}

const reveal = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function CommunityBand({
  heading,
  body,
  stats,
  ctaLabel,
  ctaHref,
  instagramHandle,
  className,
}: CommunityBandProps) {
  const instaUrl = `https://instagram.com/${instagramHandle.replace(/^@/, '')}`;

  return (
    <AdaptiveMotion.section
      className={cn(
        'relative w-full rounded-neo border-3 border-neo-black bg-neo-lime',
        'shadow-hard-lg overflow-hidden',
        'px-6 py-8 sm:px-10 sm:py-10',
        'flex flex-col lg:flex-row lg:items-center gap-8',
        className
      )}
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className="flex-1 max-w-2xl">
        <h2 className="font-neo-display text-2xl sm:text-4xl font-black uppercase text-neo-black leading-tight neo-title mb-3">
          {heading}
        </h2>
        <p className="font-neo-body text-sm sm:text-base font-semibold text-neo-black/80 leading-snug mb-6">
          {body}
        </p>

        {/* Giant inline stats */}
        <div className="flex flex-wrap gap-6 sm:gap-10 mb-7">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="font-neo-display text-3xl sm:text-5xl font-black text-neo-black leading-none">
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] sm:text-xs font-black uppercase tracking-wide text-neo-black/70">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA + social */}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={ctaHref}
            className={cn(
              'inline-flex items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-black',
              'px-5 py-3 font-neo-display font-black uppercase text-sm sm:text-base text-neo-lime',
              'shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg transition-all'
            )}
          >
            {ctaLabel}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <a
            href={instaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-neo-body font-bold text-sm text-neo-black/80 hover:text-neo-black transition-colors"
          >
            <Instagram className="w-5 h-5" aria-hidden="true" />
            {instagramHandle}
          </a>
        </div>
      </div>

      {/* Celebrating mascot, framed as a clean circle badge (forced clip so the
          dark-bg variant never shows as a rectangle on the lime). Decorative. */}
      <div className="hidden lg:block shrink-0" aria-hidden="true">
        <Mascot
          variant="celebration"
          size="2xl"
          animated
          priority={false}
          clipShape="circle"
          clipBorder="white"
        />
      </div>
    </AdaptiveMotion.section>
  );
}

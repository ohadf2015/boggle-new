'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { BlogProse } from '@/components/blog/BlogProse';
import { LandingButton, LandingPage, Prose, type LandingTone } from '@/components/landing/kit';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';

const TONE_BG: Record<LandingTone, string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  purple: 'bg-neo-purple',
  yellow: 'bg-neo-yellow',
  orange: 'bg-neo-orange',
  paper: 'bg-neo-cream',
};

export interface BlogPostLayoutProps {
  locale: string;
  backLabel: React.ReactNode;
  category: React.ReactNode;
  categoryTone?: LandingTone;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  date?: string;
  byline?: React.ReactNode;
  readTime: React.ReactNode;
  image?: { src: string; alt: string };
  ctas: { href: string; label: React.ReactNode }[];
  backHref?: string;
  intro?: React.ReactNode;
  after?: React.ReactNode;
  children: React.ReactNode;
}

export function BlogPostLayout({
  locale,
  backLabel,
  category,
  categoryTone = 'cyan',
  title,
  subtitle,
  date,
  byline,
  readTime,
  image,
  ctas,
  backHref,
  intro,
  after,
  children,
}: BlogPostLayoutProps) {
  const { language } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-neo-navy">
      <AutoHideHeader />
      <LandingPage locale={locale} topBar={false} className="max-w-3xl gap-8 sm:gap-10">
        <article className="flex flex-col gap-8 sm:gap-10">
          <header className="flex flex-col items-start gap-4 pt-2 lg:pt-6">
            <Link
              href={backHref ?? `/${locale}/blog`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-neo-white/25 px-4 text-sm font-bold text-neo-white/85 hover:border-neo-white/60 hover:text-neo-white focus-visible:outline-3 focus-visible:outline-neo-white"
            >
              <ArrowLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
              {backLabel}
            </Link>
            <span
              className={cn(
                'rounded-full border-2 border-neo-black px-3 py-1 text-xs font-bold uppercase tracking-wide text-neo-black shadow-hard-sm',
                TONE_BG[categoryTone],
              )}
            >
              {category}
            </span>
            <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl">{title}</h1>
            {subtitle && <p className="text-lg leading-relaxed text-neo-white/85">{subtitle}</p>}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-neo-white/70">
              {byline && <span className="font-bold">{byline}</span>}
              {date && (
                <span className="flex items-center gap-1.5">
                  <Calendar aria-hidden className="h-4 w-4" />
                  {safeToLocaleDateString(new Date(date), language, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock aria-hidden className="h-4 w-4" />
                {readTime}
              </span>
            </div>
            {image && (
              <div className="relative mt-2 aspect-[16/9] w-full overflow-hidden rounded-neo-lg border-3 border-neo-black shadow-hard-xl">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 768px) 768px, calc(100vw - 2rem)"
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </header>

          <InlineBannerAd webZone="content-page" />

          {intro}

          <Prose paper className="max-w-none text-[17px] [&_h2]:mt-8 [&>:first-child>h2:first-child]:mt-0">
            {children}
          </Prose>

          <InlineBannerAd webZone="content-page" />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {ctas.map((cta, i) => (
              <LandingButton key={cta.href} href={cta.href} variant={i === 0 ? 'primary' : 'secondary'}>
                {cta.label}
              </LandingButton>
            ))}
          </div>
        </article>
        {after}
      </LandingPage>
    </div>
  );
}

export function BlogSections({
  sections,
  linkify = false,
}: {
  sections: { title?: string; content: string }[];
  linkify?: boolean;
}) {
  return (
    <>
      {sections.map((section, index) => (
        <div key={`section-${index}`} className="space-y-4">
          {section.title && <h2>{section.title}</h2>}
          {section.content.split('\n\n').map((paragraph, pIndex) => (
            <p key={`section-${index}-p-${pIndex}`}>{linkify ? <BlogProse text={paragraph} /> : paragraph}</p>
          ))}
        </div>
      ))}
    </>
  );
}

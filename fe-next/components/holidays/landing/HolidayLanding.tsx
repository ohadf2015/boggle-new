import Image from 'next/image';
import Link from 'next/link';
import { fill, formatLandingDate, landingCopy, type LandingCopy } from '@/lib/holidays/landingCopy';
import { heroArt, landingJsonLd, landingSeason, type HolidayLanding as Landing, type LandingSeason } from '@/lib/holidays/landing';
import { LandingTopBar } from '@/components/landing/kit';
import LandingMascot from './LandingMascot';
import { ArcadeSection, ClosingSection, EggSection, FaqSection, FeatureSection } from './HolidayLandingSections';

interface Props {
  page: Landing;
  now: Date;
}

const ACCENT = {
  hanukkah: { cta: 'bg-neo-holiday-gold text-neo-navy', ring: 'border-neo-holiday-blue', chip: 'bg-neo-holiday-blue text-neo-white', spark: '/holidays/props-star.webp' },
  christmas: { cta: 'bg-neo-holiday-red text-neo-white', ring: 'border-neo-holiday-pine', chip: 'bg-neo-holiday-pine text-neo-white', spark: '/holidays/props-snowflake.webp' },
} as const;

function dateVars(copy: LandingCopy, win: NonNullable<LandingSeason['window']>) {
  return {
    preview: formatLandingDate(win.previewStart, copy.dateLocale),
    start: formatLandingDate(win.start, copy.dateLocale),
    end: formatLandingDate(win.end, copy.dateLocale),
  };
}

const STATUS = { off: 'offBanner', preview: 'soonBadge', live: 'liveBadge' } as const;

function statusLine(copy: LandingCopy, season: LandingSeason): string {
  if (!season.window) return copy.offUnknown;
  return fill(copy[STATUS[season.phase]], dateVars(copy, season.window));
}

function whenAnswer(copy: LandingCopy, season: LandingSeason): string {
  if (!season.window) return copy.whenUnknown;
  return fill(copy.whenA, dateVars(copy, season.window));
}

export default function HolidayLanding({ page, now }: Props) {
  const { holiday, locale } = page;
  const copy = landingCopy(holiday, locale);
  const season = landingSeason(holiday, locale, now);
  const faqs = [...copy.faqs, { q: copy.whenQ, a: whenAnswer(copy, season) }];
  const accent = ACCENT[holiday];
  const hero = heroArt(holiday);
  const ctaHref = season.live ? `/${locale}?holiday=${holiday}` : `/${locale}/multiplayer`;

  return (
    <main dir={locale === 'he' ? 'rtl' : 'ltr'} lang={locale} className="min-h-screen bg-neo-navy text-neo-white">
      <script
        id={`ld-holiday-${page.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd(page, season, faqs)).replace(/</g, '\\u003c') }}
      />
      <LandingTopBar locale={locale} play={{ href: ctaHref, label: season.live ? copy.ctaLive : copy.ctaOff }} />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-2 sm:px-6">
        <section className={`relative overflow-hidden rounded-neo-xl border-4 ${accent.ring} bg-neo-navy shadow-hard-xl`}>
          <Image src={hero.url} alt="" width={hero.width} height={hero.height} priority sizes="(min-width: 1024px) 960px, 100vw" className="h-44 w-full object-cover sm:h-64" />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:p-8">
            <div className="-mt-24 self-center sm:-mt-28 sm:self-auto">
              <LandingMascot src={copy.mascot} label={copy.mascotLabel} sparkSrc={accent.spark} />
            </div>
            <div className="flex-1">
              <p
                data-testid="holiday-landing-status"
                data-phase={season.phase}
                className={`mb-3 inline-block rounded-neo-pill border-2 border-neo-black px-3 py-1 text-sm font-bold shadow-hard-sm ${season.live ? accent.chip : 'bg-neo-holiday-snow text-neo-navy'}`}
              >
                {statusLine(copy, season)}
              </p>
              <h1 className="font-neo-display text-3xl font-black leading-tight sm:text-5xl">{page.h1}</h1>
            </div>
          </div>
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <p className="max-w-3xl text-lg leading-relaxed text-neo-gray-200">{copy.intro}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                data-testid="holiday-landing-cta"
                href={ctaHref}
                className={`rounded-neo border-4 border-neo-black px-8 py-4 text-center text-lg font-black shadow-hard transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed motion-reduce:transition-none ${accent.cta}`}
              >
                {season.live ? copy.ctaLive : copy.ctaOff}
              </Link>
              <Link
                href={season.live ? `/${locale}/daily?holiday=${holiday}` : `/${locale}/daily`}
                className="rounded-neo border-4 border-neo-holiday-snow px-6 py-4 text-center font-bold text-neo-holiday-snow shadow-hard transition-[background-color] hover:bg-neo-holiday-snow/10"
              >
                {copy.ctaDaily}
              </Link>
            </div>
          </div>
        </section>

        <FeatureSection copy={copy} />
        <ArcadeSection copy={copy} holiday={holiday} locale={locale} live={season.live} />
        <EggSection copy={copy} />
        <FaqSection title={copy.faqTitle} faqs={faqs} />
        <ClosingSection copy={copy} ctaHref={ctaHref} ctaLabel={season.live ? copy.ctaLive : copy.ctaOff} ctaClass={accent.cta} />
      </div>
    </main>
  );
}

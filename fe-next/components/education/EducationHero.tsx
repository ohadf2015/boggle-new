'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { locales } from '@/lib/i18n';
import Mascot from '@/components/ui/Mascot';
import { TEACHER_PRO_CHECKOUT_PATH, teacherProCheckoutCtaLabel } from './TeacherProCheckoutCta';

// Derived from the shipped locales so the "built for N languages" line can't go stale.
const LANGUAGE_COUNT = String(locales.length);

// Client-only and below the h1 in source order: the headline stays the LCP element and
// the board never blocks first paint. The placeholder reserves the box so nothing shifts.
const EducationLandingDemo = dynamic(
  () => import('./EducationLandingDemo').then((m) => m.EducationLandingDemo),
  {
    ssr: false,
    loading: () => <div aria-hidden className="min-h-[22rem] rounded-neo border-neo-thick border-neo-cream/60 bg-neo-navy-light" />,
  },
);

export function EducationHero({ setupPending = false }: { setupPending?: boolean } = {}) {
  const { t, language } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-neo-navy">
      <div className="relative mx-auto grid max-w-6xl items-start gap-8 px-4 py-4 sm:py-8 lg:grid-cols-2 lg:gap-12">
        <div className="text-center lg:text-start">
          <p data-hero-item className="text-sm font-bold uppercase tracking-wider text-neo-pink">
            {t('eg2Land.hero.eyebrow')}
          </p>
          <h1
            data-hero-item
            className="mt-3 text-4xl sm:text-5xl font-neo-display font-black leading-tight text-neo-cream"
          >
            {t('eg2Land.hero.h1')}
          </h1>
          <p data-hero-item className="education-hero-sub mt-5 text-base sm:text-lg text-neo-cream/80">
            {t('eg2Land.hero.sub', undefined, { count: LANGUAGE_COUNT })}
          </p>

          <div data-hero-item className="mt-6 flex flex-col items-center gap-3 lg:items-start">
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:flex-wrap lg:items-center">
              <Link
                href={`/${language}/education/access`}
                data-testid="education-hero-free-cta"
                onClick={() => trackLandingCtaClick(setupPending ? 'education_hero_finish_setup' : 'education_hero')}
                className="group inline-flex items-center gap-3 rounded-neo border-neo-thick border-neo-navy bg-neo-lime px-8 py-4 text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform duration-150 hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none"
              >
                {t(setupPending ? 'eg2Land.hero.ctaFinishSetup' : 'eg2Land.hero.ctaPrimary')}
                <DirectionalIcon
                  icon={ArrowRight}
                  className="size-6 shrink-0 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 motion-reduce:transition-none"
                />
              </Link>
              <Link
                href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
                data-testid="education-hero-pro-cta"
                onClick={() => trackLandingCtaClick('education_hero_pro')}
                className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-neo border-2 border-neo-cyan px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-neo-cyan shadow-hard-sm transition-all hover:bg-neo-cyan/15 hover:shadow-hard"
              >
                {teacherProCheckoutCtaLabel(language)}
              </Link>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-neo-cream/70">{t('eg2Land.hero.note')}</p>
          </div>
        </div>

        {/* No `order-*` on purpose: source order already puts the board second, and an
            unprefixed `order-first` would hoist it above the h1 on every viewport under lg. */}
        <div data-hero-item className="relative">
          <EducationLandingDemo />
          <div
            aria-hidden
            style={{ insetInlineStart: 'calc(50% - 14rem - 5.5rem)' }}
            className="pointer-events-none absolute bottom-10 hidden sm:block"
          >
            <Mascot variant="scholar" size="xs" clipShape="circle" clipBorder="lime" />
          </div>
        </div>
      </div>
    </section>
  );
}

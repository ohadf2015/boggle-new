'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, KeyRound, Languages, Laptop } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { locales } from '@/lib/i18n';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_CHECKOUT_PATH } from './TeacherProCheckoutCta';

// Derived from the shipped locales so the "built for N languages" line can't go stale.
const LANGUAGE_COUNT = String(locales.length);

// Client-only and below the h1 in source order: the headline stays the LCP element and
// the board never blocks first paint. The placeholder reserves the box so nothing shifts.
const EducationLandingDemo = dynamic(
  () => import('./EducationLandingDemo').then((m) => m.EducationLandingDemo),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden className="h-[27rem] rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light sm:h-[24rem]" />
    ),
  },
);

const PROOF = [
  { key: 'noLogins', Icon: KeyRound },
  { key: 'languages', Icon: Languages },
  { key: 'anyDevice', Icon: Laptop },
] as const;

const PRESS = 'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

export function EducationHero({ setupPending = false }: { setupPending?: boolean } = {}) {
  const { t, language } = useLanguage();

  return (
    <section data-testid="education-hero" className="relative overflow-hidden bg-neo-navy">
      <div className="relative mx-auto grid max-w-6xl items-start gap-6 px-4 pb-8 pt-5 sm:px-6 sm:pt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8 lg:pb-14">
        <div className="text-center lg:pt-6 lg:text-start">
          <h1 className="text-balance font-neo-display text-[2rem] font-black leading-[1.08] text-neo-cream sm:text-5xl">
            {t('eg2Land.hero.h1')}
          </h1>
          <p className="education-hero-sub mx-auto mt-4 max-w-[46ch] text-base text-neo-cream/80 sm:text-lg lg:mx-0">
            {t('eduPlans.hero.sub', undefined, { count: LANGUAGE_COUNT })}
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-3 sm:items-center lg:flex-row lg:items-center">
            <Link
              href={`/${language}/education/access`}
              data-testid="education-hero-free-cta"
              onClick={() => trackLandingCtaClick(setupPending ? 'education_hero_finish_setup' : 'education_hero')}
              className={`group inline-flex min-h-14 items-center justify-center gap-3 whitespace-nowrap rounded-neo border-3 border-neo-black bg-neo-lime px-6 text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard hover:-translate-y-0.5 ${PRESS}`}
            >
              {t(setupPending ? 'eg2Land.hero.ctaFinishSetup' : 'eg2Land.hero.ctaPrimary')}
              <DirectionalIcon icon={ArrowRight} className="size-6 shrink-0" />
            </Link>
            <Link
              href={`/${language}/join`}
              data-testid="education-hero-join-cta"
              onClick={() => trackLandingCtaClick('education_hero_student_join')}
              className={`inline-flex min-h-14 items-center justify-center gap-2 whitespace-nowrap rounded-neo border-3 border-neo-cream/70 px-5 font-neo-display text-base font-black text-neo-cream hover:border-neo-cyan hover:text-neo-cyan ${PRESS}`}
            >
              <span className="text-neo-cream/70 lg:hidden xl:inline">{t('eduPlans.hero.studentLead')}</span>
              {t('eduPlans.hero.studentJoin')}
            </Link>
          </div>

          <p className="mt-4 text-sm font-bold text-neo-cream/70">
            {t('eg2Land.hero.note')}
            {' · '}
            <Link
              href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
              data-testid="education-hero-pro-cta"
              onClick={() => trackLandingCtaClick('education_hero_pro')}
              className="rounded-sm text-neo-yellow underline decoration-2 underline-offset-4 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
            >
              {t('eduPlans.hero.proLink', { price: `$${TEACHER_PRO_PRICE_USD}` })}
            </Link>
          </p>

          <ul aria-label={t('eg2Land.proof.label')} className="mx-auto mt-6 hidden max-w-md flex-col gap-2 text-start sm:flex lg:mx-0">
            {PROOF.map(({ key, Icon }) => (
              <li key={key} className="flex items-center gap-2.5 text-sm font-bold text-neo-cream/85">
                <Icon className="size-4 shrink-0 text-neo-lime" strokeWidth={2.5} aria-hidden="true" />
                {t(`eg2Land.proof.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* No `order-*` on purpose: source order already puts the board second, and an
            unprefixed `order-first` would hoist it above the h1 on every viewport under lg. */}
        <div data-hero-item className="relative">
          <EducationLandingDemo />
        </div>
      </div>
    </section>
  );
}

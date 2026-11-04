'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, KeyRound, Languages, Laptop } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { locales } from '@/lib/i18n';
import { PRO_COPY_PARAMS } from '@/lib/education/proFeatures';
import { LandingProPill } from './LandingProPill';
import { TEACHER_PRO_CHECKOUT_PATH } from './TeacherProCheckoutCta';
import { Reveal } from './motion';

// Derived from the shipped locales so the "built for N languages" line can't go stale.
const LANGUAGE_COUNT = String(locales.length);

// Client-only and below the h1 in source order: the headline stays the LCP element and
// the board never blocks first paint. The placeholder reserves the box so nothing shifts.
const EducationLandingDemo = dynamic(
  () => import('./EducationLandingDemo').then((m) => m.EducationLandingDemo),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden className="h-[22rem] rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light sm:h-[29.25rem] lg:h-[24.75rem] xl:h-[28.75rem]" />
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
    <section data-testid="education-hero" className="relative overflow-hidden border-b-3 border-neo-cream/40 bg-neo-navy">
      <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-6 px-4 pb-8 pt-5 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] xl:gap-x-14 lg:gap-y-10 lg:px-8 lg:pb-12 lg:pt-12">
        <div className="text-center lg:max-w-[34rem] lg:pt-4 lg:text-start">
          <h1 className="text-balance font-neo-poster text-[1.75rem] font-extrabold leading-[1.08] tracking-[-0.015em] text-neo-cream [overflow-wrap:anywhere] sm:text-[2.6rem] xl:text-[2.9rem]">
            {t('eg2Land.hero.h1')}
          </h1>
          <p className="education-hero-sub mx-auto mt-4 max-w-[46ch] text-base text-neo-cream/80 sm:text-lg lg:mx-0 lg:mt-5">
            {t('eduPlans.hero.sub', undefined, { count: LANGUAGE_COUNT })}
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-1 sm:items-center sm:gap-2 lg:mt-8 lg:items-start">
            <Link
              href={`/${language}/education/access`}
              data-testid="education-hero-free-cta"
              data-lc-cta="signup"
              onClick={() => trackLandingCtaClick(setupPending ? 'education_hero_finish_setup' : 'education_hero')}
              className={`group inline-flex min-h-14 items-center justify-center gap-3 text-balance rounded-neo py-2 border-3 border-neo-black bg-neo-lime px-6 text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard hover:-translate-y-0.5 ${PRESS}`}
            >
              {t(setupPending ? 'eg2Land.hero.ctaFinishSetup' : 'eg2Land.hero.ctaPrimary')}
              <DirectionalIcon icon={ArrowRight} className="size-6 shrink-0" />
            </Link>
            <Link
              href={`/${language}/join`}
              data-testid="education-hero-join-cta"
              data-lc-cta="student_join"
              onClick={() => trackLandingCtaClick('education_hero_student_join')}
              className={`inline-flex min-h-11 flex-wrap items-center justify-center gap-x-2 rounded-neo-sm px-2 font-neo-display lg:-mx-2 text-base font-black text-neo-cream hover:text-neo-cyan ${PRESS}`}
            >
              <span className="text-neo-cream/70">{t('eduPlans.hero.studentLead')}</span>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span className="underline decoration-2 underline-offset-4">{t('eduPlans.hero.studentJoin')}</span>
                <DirectionalIcon icon={ArrowRight} className="size-4 shrink-0" />
              </span>
            </Link>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0 text-sm sm:mt-3 sm:gap-y-1 font-bold text-neo-cream/70 lg:justify-start">
            <span>{t('eg2Land.hero.note')}</span>
            <Link
              href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
              data-testid="education-hero-pro-cta"
              data-lc-cta="pro_upgrade"
              onClick={() => trackLandingCtaClick('education_hero_pro')}
              className="inline-flex min-h-11 items-center gap-2 rounded-neo-sm px-1 text-neo-cream hover:text-neo-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
            >
              <LandingProPill label={t('eduPro.pill', 'Pro')} />
              <span className="underline decoration-2 underline-offset-4">
                {t('eduPlans.hero.proLink', { price: PRO_COPY_PARAMS.price })}
              </span>
            </Link>
          </div>
        </div>

        {/* No `order-*` on purpose: source order already puts the board second, and an
            unprefixed `order-first` would hoist it above the h1 on every viewport under lg. */}
        <div data-hero-item className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -rotate-2 rounded-neo border-3 border-neo-black bg-neo-pink sm:-rotate-3 rtl:rotate-2 sm:rtl:rotate-3"
          />
          <Reveal delay={0.12} className="relative">
            <EducationLandingDemo />
          </Reveal>
        </div>

        <ul
          aria-label={t('eg2Land.proof.label')}
          className="hidden gap-3 border-t-2 border-neo-cream/15 pt-6 text-start sm:grid sm:grid-cols-3 lg:col-span-2"
        >
          {PROOF.map(({ key, Icon }) => (
            <li key={key} className="flex items-start gap-3 text-sm font-bold leading-snug text-neo-cream/85">
              <span className="grid size-9 shrink-0 place-items-center rounded-neo-sm border-2 border-neo-black bg-neo-lime text-neo-navy shadow-hard-sm">
                <Icon className="size-4" strokeWidth={2.75} aria-hidden="true" />
              </span>
              <span className="pt-1.5">{t(`eg2Land.proof.${key}`, { count: LANGUAGE_COUNT })}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

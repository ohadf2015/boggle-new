'use client';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { locales } from '@/lib/i18n';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { EducationModeMock } from './EducationModeMock';
import {
  TEACHER_PRO_CHECKOUT_PATH,
  teacherProCheckoutCtaLabel,
} from './TeacherProCheckoutCta';
import Mascot from '@/components/ui/Mascot';

/**
 * The hero's language *count* is derived from the shipped locale list rather than
 * written into the copy. It read "Built natively for 5 languages" while
 * `lib/i18n.js` already shipped `ru`, so a Russian teacher landed on
 * /ru/education and was told the product didn't speak their language.
 *
 * The eyebrow's language *list* stays hand-written per locale on purpose: every
 * non-English locale names the languages in its own words ("עברית, אנגלית…",
 * "英語・ヘブライ語…"), which reads far better than injecting uppercase ASCII
 * codes. `EducationHero.contrast.test.ts` carries a tripwire on
 * `locales.length` so locale number seven has to revisit that copy instead of
 * silently shipping a short list.
 */
const LANGUAGE_COUNT = String(locales.length);

/**
 * Design tokens (from frontend-design skill):
 * - Hero: dark neo-navy background with neo-lime primary CTA
 * - Primary CTA: Free teacher access path → /education/access.
 *   Designed to reduce friction: "much more difficult to navigate than other sites"
 *   feedback led to prioritizing the free teacher path first.
 * - Secondary CTA: Teacher Pro checkout ($TEACHER_PRO_PRICE_USD/mo) → /teacher/upgrade.
 *   Revenue path stays visible and above the fold.
 * - Right column shows EducationModeMock — a live "see it in action" preview.
 * The copy is painted on first frame. A fade-in and a pulsing button
 * both compete with the one lime action.
 */

export function EducationHero() {
  const { t, language } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-neo-navy">
      <div className="relative mx-auto grid max-w-6xl items-start gap-8 px-4 py-4 sm:py-8 lg:grid-cols-2 lg:gap-12">
        {/* Left column: copy + single CTA */}
        <div className="text-center lg:text-start">
          <p
            data-hero-item
            className="text-sm font-bold uppercase tracking-wider text-neo-pink"
          >
            {t('education.landing.hero.eyebrow')}
          </p>
          <h1
            data-hero-item
            className="mt-3 text-4xl sm:text-5xl font-neo-display font-black leading-tight text-neo-cream"
          >
            {t('education.landing.hero.h1')}
          </h1>
          <p
            data-hero-item
            className="education-hero-sub mt-5 text-base sm:text-lg text-neo-cream/80"
          >
            {t('education.landing.hero.sub', undefined, { count: LANGUAGE_COUNT })}
          </p>

          <div data-hero-item className="mt-5 flex flex-col items-center gap-3 lg:items-start">
            <div className="flex flex-col items-center gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <Link
              href={`/${language}/teacher`}
              data-testid="education-hero-free-cta"
              onClick={() => trackLandingCtaClick('education_hero')}
              className="group inline-flex items-center gap-3 rounded-neo border-neo-thick border-neo-navy bg-neo-lime px-8 py-4 text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform duration-150 hover:translate-x-[3px] hover:translate-y-[3px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none"
            >
              {t('education.landing.hero.cta_primary')}
              <span
                aria-hidden
                className="text-xl transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              >
                →
              </span>
            </Link>
            <Link
              href={`/${language}/student/join`}
              data-testid="education-hero-join-cta"
              onClick={() => trackLandingCtaClick('education_hero_join')}
              className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-base font-bold text-neo-cream underline decoration-2 underline-offset-4 hover:text-neo-white"
            >
              {t('education.landing.studentJoinCta')}
            </Link>
            </div>
            <Link
              href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
              data-testid="education-hero-pro-cta"
              onClick={() => trackLandingCtaClick('education_hero_pro')}
              className="inline-flex items-center gap-2 rounded-neo border-2 border-neo-cyan px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-neo-cyan shadow-hard-sm transition-all hover:bg-neo-cyan/15 hover:shadow-hard"
            >
              {teacherProCheckoutCtaLabel(language)}
            </Link>
            <p className="text-xs font-bold uppercase tracking-wider text-neo-cream/70">
              {t(
                'education.landing.hero.cta_note',
                `Free plan to start · Teacher Pro $${TEACHER_PRO_PRICE_USD}/mo`,
              )}
            </p>
            <Link
              href={`/${language}/education/for-schools`}
              onClick={() => trackLandingCtaClick('hero_for_schools')}
              className="text-xs font-bold text-neo-cream/80 underline underline-offset-2 hover:text-neo-cream transition-colors"
            >
              {t('education.landing.hero.cta_schools')}
            </Link>
          </div>
        </div>

        {/* Right column: live product mock. No `order-*` here on purpose — the
            mock is already the second grid child, so it sits right on desktop
            by source order, and any unprefixed `order-first` would hoist it
            above the h1 and the CTA on every viewport under lg. */}
        <div data-hero-item className="relative">
          <EducationModeMock />
          {/* Lexi studying next to the live mock — the one genuinely animated
              element in the hero (scholar.webp is a 98-frame loop, not a still).
              `clipShape` is not decoration: scholar.webp has an OPAQUE dark
              background, so unclipped it punches a dark rectangle through the
              mock's leaderboard card. Clipped to a bordered circle it reads as a
              deliberate badge instead.
              Decorative and aria-hidden — the h1 carries the meaning, and the
              component's fallback alt is an untranslated English string.
              Hidden under sm so it never crowds the mock on a phone. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-6 -start-6 hidden sm:block"
          >
            <Mascot variant="scholar" size="md" clipShape="circle" clipBorder="lime" />
          </div>
        </div>
      </div>
    </section>
  );
}

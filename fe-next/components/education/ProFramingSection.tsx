'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';
import { ProFeaturePreview } from '@/components/teacher/pro/ProFeaturePreview';

// `wide` rows only show from sm up, so a phone gets the four that carry the decision.
const PRO_POINTS = [
  { key: 'education.landing.pro.everythingInFree', wide: true },
  { key: 'education.landing.pro.classLimitPro', wide: false },
  { key: 'eg6Land.pro.rosterPro', wide: true },
  { key: 'education.landing.pro.analytics', wide: false },
  { key: 'eg6Land.pro.mastery', wide: false },
  { key: 'eg6Land.pro.missedPractice', wide: true },
  { key: 'eg6Land.pro.reports', wide: false },
] as const;

/**
 * The landing's one Pro section: what Pro shows after a game (sample data), the Pro card,
 * and what Free already covers. Every number comes from the tier constants.
 * `cta` replaces the default upgrade link (the landing passes the SSR checkout CTA).
 */
export function ProFramingSection({ cta }: { cta?: ReactNode } = {}) {
  const { t, language } = useLanguage();

  return (
    <section id="pro" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
      <div className="grid gap-6 rounded-neo-xl border-3 border-neo-cream/40 bg-neo-navy-light p-4 shadow-hard-lg sm:p-7 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <h2 className="text-balance font-neo-poster text-2xl font-extrabold leading-tight tracking-[-0.01em] text-neo-white [overflow-wrap:anywhere] sm:text-3xl">
            {t('education.landing.pro.title')}
          </h2>
          <p className="mt-2 max-w-[52ch] text-base text-neo-white/80">{t('education.landing.pro.subtitle')}</p>
          <p className="mt-5 font-neo-display text-sm font-black text-neo-yellow">{t('eg2Pro.strip.title')}</p>
          <div aria-hidden="true" className="pointer-events-none mt-2 select-none">
            <ProFeaturePreview feature="mastery" />
          </div>
          <p className="mt-2 text-xs font-bold text-neo-white/60">{t('eg2Pro.strip.lead')}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Free Tier */}
          <div className="flex items-center gap-3 rounded-neo border-2 border-dashed border-neo-cream/40 bg-neo-navy p-3">
            <Image
              src="/images/education/pro-unlocks.webp"
              alt={t('education.landing.pro.comparisonAlt')}
              width={1168}
              height={880}
              sizes="96px"
              className="w-20 shrink-0 rounded-neo-sm sm:w-24"
            />
            <div className="min-w-0 text-sm text-neo-white">
              <p className="font-neo-display font-black text-neo-white">
                {t('education.landing.pro.freeTier')} · $0
              </p>
              <p className="mt-0.5 text-neo-white">
                <span>{t('education.landing.pro.classLimit', { count: String(FREE_TIER_LIMITS.classes) })}</span>
                {' · '}
                <span>{t('education.landing.pro.studentLimit', { count: String(FREE_TIER_LIMITS.studentsPerClass) })}</span>
                {' · '}
                <span>{t('education.landing.pro.customLists')}</span>
                {' · '}
                <span>{t('education.landing.pro.noAds')}</span>
              </p>
              <p className="mt-1 text-xs font-bold text-neo-white">{t('education.landing.pro.freeForever')}</p>
            </div>
          </div>

          {/* Pro Tier */}
          <div className="rounded-neo border-3 border-neo-yellow bg-neo-navy-elevated p-4 text-neo-white shadow-hard sm:p-5">
            <p className="inline-flex items-center gap-1.5 font-neo-display text-xl font-black text-neo-white">
              <Crown className="size-5 text-neo-yellow" strokeWidth={2.5} aria-hidden="true" />
              {t('education.landing.pro.proTier')}
            </p>
            <p className="mt-2 font-neo-display font-black leading-none text-neo-white">
              <bdi dir="ltr" className="text-5xl">${TEACHER_PRO_PRICE_USD}</bdi>
              <span className="ms-2 text-base font-bold text-neo-white/80">{t('education.landing.pro.perMonth')}</span>
            </p>
            <p className="mt-2 text-sm font-bold text-neo-white/85">
              {t('eduPlans.pro.trialLine', { days: TEACHER_PRO_TRIAL_DAYS })}
            </p>
            <ul className="mt-3 space-y-1.5">
              {PRO_POINTS.map(({ key, wide }) => (
                <li key={key} className={`${wide ? 'hidden sm:flex' : 'flex'} items-start gap-2 text-sm font-bold text-neo-white`}>
                  <Check className="mt-0.5 size-4 shrink-0 text-neo-yellow" strokeWidth={3} aria-hidden="true" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              {cta ?? (
                <Link
                  href={`/${language}/teacher/upgrade`}
                  data-testid="pro-framing-upgrade-link"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-neo border-3 border-neo-black bg-neo-yellow px-4 font-neo-display font-black text-neo-navy shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
                >
                  {t('education.landing.pro.chooseNow')}
                </Link>
              )}
            </div>
          </div>

          {/* Why now: the one limit both plans share, said once */}
          <p className="text-xs font-bold text-neo-white/70">
            {t('eg6Land.pro.liveCap', undefined, { count: String(MAX_PLAYERS_PER_ROOM) })}
          </p>
        </div>
      </div>
    </section>
  );
}

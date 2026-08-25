'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { m } from 'framer-motion';

/**
 * Pro framing section — positioned on the landing page to show the value
 * of upgrading from the free tier.
 *
 * Uses constants to ensure advertised limits/price match enforcement.
 * All text sourced from t() — no hardcoded strings.
 */
export function ProFramingSection() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-neo-display font-black text-neo-white mb-3">
          {t('education.landing.pro.title')}
        </h2>
        <p className="text-lg text-neo-white/80">
          {t('education.landing.pro.subtitle')}
        </p>
      </div>

      {/* Two-column tier comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Free Tier */}
        <div className="rounded-neo border-neo border-neo-cyan/60 bg-neo-navy-light p-6 shadow-hard">
          <h3 className="text-2xl font-neo-display font-black text-neo-cyan mb-4">
            {t('education.landing.pro.freeTier')}
          </h3>

          <div className="mb-6 pb-6 border-b border-neo-white/20">
            <p className="text-4xl font-neo-display font-black text-neo-white">
              $0
              <span className="text-base text-neo-white/70 font-bold ms-2">
                {t('education.landing.pro.perMonth')}
              </span>
            </p>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="text-neo-lime font-bold mt-0.5">✓</span>
              <span className="text-neo-white">
                {t('education.landing.pro.classLimit', {
                  count: String(FREE_TIER_LIMITS.classes),
                })}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neo-lime font-bold mt-0.5">✓</span>
              <span className="text-neo-white">
                {t('education.landing.pro.studentLimit', {
                  count: String(FREE_TIER_LIMITS.studentsPerClass),
                })}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neo-lime font-bold mt-0.5">✓</span>
              <span className="text-neo-white">{t('education.landing.pro.noAds')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neo-lime font-bold mt-0.5">✓</span>
              <span className="text-neo-white">{t('education.landing.pro.analytics')}</span>
            </li>
          </ul>

          <p className="text-sm text-neo-white/70 font-bold">
            {t('education.landing.pro.freeForever')}
          </p>
        </div>

        {/* Pro Tier */}
        <div className="rounded-neo border-neo-thick border-neo-lime bg-neo-navy-light p-6 shadow-hard-lg relative md:scale-105">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-neo-pink px-4 py-1 border-2 border-black rounded-neo">
            <span className="font-neo-display font-black text-black text-sm">
              ⭐ {t('teacher.subscription.popular')}
            </span>
          </div>

          <h3 className="text-2xl font-neo-display font-black text-neo-black mb-4 mt-2">
            {t('education.landing.pro.proTier')}
          </h3>

          <div className="mb-6 pb-6 border-b border-neo-black/20">
            <p className="text-5xl font-neo-display font-black text-neo-black leading-none">
              ${TEACHER_PRO_PRICE_USD}
              <span className="text-base text-neo-black/80 font-bold ms-2">
                {t('education.landing.pro.perMonth')}
              </span>
            </p>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="text-neo-black font-bold mt-0.5">✓</span>
              <span className="text-neo-black font-bold">
                {t('education.landing.pro.classLimitPro')}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neo-black font-bold mt-0.5">✓</span>
              <span className="text-neo-black font-bold">
                {t('education.landing.pro.studentLimitPro')}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neo-black font-bold mt-0.5">✓</span>
              <span className="text-neo-black">{t('education.landing.pro.analytics')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neo-black font-bold mt-0.5">✓</span>
              <span className="text-neo-black">{t('education.landing.pro.customLists')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-neo-black font-bold mt-0.5">✓</span>
              <span className="text-neo-black">{t('education.landing.pro.duels')}</span>
            </li>
          </ul>

          <Link
            href={`/${language}/teacher/upgrade`}
            className="inline-block w-full text-center rounded-neo bg-neo-cyan text-neo-navy font-bold py-3 border-neo shadow-hard hover:shadow-hard-lg transition-shadow"
          >
            {t('education.landing.pro.chooseNow')}
          </Link>
        </div>
      </div>

      {/* Why now — honest framing */}
      <div className="rounded-neo border-neo border-neo-white/20 bg-neo-navy-light p-6 text-center">
        {/* The student cap is named in this sentence too, so it interpolates from the same
            constant as the tier card above. Hardcoding it in copy desyncs the moment the cap
            moves — it was 30 until 2026-08-23. */}
        <p className="text-neo-white text-lg leading-relaxed">
          {t('education.landing.pro.whyNow', {
            count: String(FREE_TIER_LIMITS.studentsPerClass),
          })}
        </p>
      </div>
    </section>
  );
}

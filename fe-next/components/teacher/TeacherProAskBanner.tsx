'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { trackGrowthEvent } from '@/utils/growthTracking';

/**
 * The logged-in teacher hub ask.
 *
 * Hits the existing checkout path only: /{locale}/pricing is the public alias
 * of /teacher/upgrade, whose Upgrade Now button POSTs /api/subscription/checkout.
 * Do not POST checkout from this banner — ClassLimitUpsellModal already taught
 * us a second handler drifts on 401/503. Polar env is the till gate
 * (t_b7c3dde7 / PR #894 removed NEXT_PUBLIC_CHECKOUT_ENABLED).
 */
export function TeacherProAskBanner() {
  const { t, language } = useLanguage();

  return (
    <aside
      data-testid="teacher-pro-ask"
      className="bg-neo-lime border-b-3 border-black px-4 py-4"
    >
      <div className="mx-auto max-w-5xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-neo-display font-black text-neo-navy text-xl leading-tight">
            {t('teacher.subscription.proPlanName')}
            <span className="ms-2 text-neo-navy">
              ${TEACHER_PRO_PRICE_USD}
              {t('teacher.subscription.perMonth')}
            </span>
          </p>
          <ul className="mt-1 text-sm font-neo-body font-bold text-neo-navy/80 list-disc list-inside">
            <li>{t('teacher.subscription.unlimitedClasses')}</li>
            <li>{t('education.landing.pro.analytics')}</li>
          </ul>
        </div>
        <Link
          href={`/${language}/pricing`}
          className="inline-flex items-center justify-center rounded-neo bg-neo-navy text-neo-lime font-neo-display font-black text-sm px-5 py-3 border-neo border-black shadow-hard hover:shadow-hard-lg whitespace-nowrap"
          onClick={() =>
            trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'dashboard_banner' })
          }
        >
          {t('teacher.subscription.upgradeNow')}
        </Link>
      </div>
    </aside>
  );
}

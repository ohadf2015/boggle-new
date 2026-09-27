'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
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
 *
 * Milestone + entitlement decide WHETHER this mounts. Dismiss is the teacher's
 * "not now" — the persistent Pro nav entry remains the always-on path.
 */
export function TeacherProAskBanner({ onDismiss }: { onDismiss?: () => void }) {
  const { t, language } = useLanguage();

  return (
    <aside
      data-testid="teacher-pro-ask"
      className="bg-neo-lime border-b-3 border-black px-4 py-4"
    >
      <div className="mx-auto max-w-5xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
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
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/${language}/pricing`}
            className="inline-flex items-center justify-center rounded-neo bg-neo-navy text-neo-lime font-neo-display font-black text-sm px-5 py-3 border-neo border-neo-cream/40 shadow-hard hover:shadow-hard-lg whitespace-nowrap"
            onClick={() =>
              trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'dashboard_banner' })
            }
          >
            {t('teacher.subscription.upgradeNow')}
          </Link>
          {onDismiss ? (
            <button
              type="button"
              data-testid="teacher-pro-ask-dismiss"
              onClick={onDismiss}
              aria-label={t('common.close')}
              className="inline-flex size-10 items-center justify-center rounded-neo border-2 border-black bg-neo-lime text-neo-navy hover:bg-neo-navy hover:text-neo-lime focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-navy"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

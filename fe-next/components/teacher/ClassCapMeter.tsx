'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';

/** Free-class usage on the Classes tab: quiet with one slot left, one Pro link at the cap. */
export function ClassCapMeter({ count, className }: { count: number; className?: string }) {
  const { t, language } = useLanguage();
  const pro = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const limit = FREE_TIER_LIMITS.classes;
  if (pro.loading || hasProAccess(pro, nowMs) || count < limit - 1) return null;
  const full = count >= limit;

  return (
    <div
      data-testid="class-cap-meter"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-neo border-2 bg-neo-navy-light px-3 py-1.5',
        full ? 'border-neo-cream/60' : 'border-neo-cream/35',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs font-bold leading-tight text-neo-cream sm:text-sm">
          {full ? (
            <>
              <span className="max-sm:hidden">{t('eduPlans.cap.full', { limit })}</span>
              <span className="sm:hidden">{t('eduPlans.cap.used', { count, limit })}</span>
            </>
          ) : (
            t('eduPlans.cap.used', { count, limit })
          )}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(count, limit)}
          aria-label={t('eduPlans.cap.label')}
          className="flex w-20 shrink-0 gap-1 max-sm:hidden sm:w-28"
        >
          {Array.from({ length: limit }, (_, i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < count ? 'bg-neo-cream' : 'bg-neo-cream/20')} />
          ))}
        </div>
      </div>
      {full ? (
        <Link
          href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
          data-testid="class-cap-cta"
          title={t('eduPlans.cap.cta')}
          onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'class_cap_meter' })}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-cream/60 px-3 max-sm:min-h-9 max-sm:min-w-9 max-sm:px-0 font-neo-display text-sm font-bold text-neo-cream transition-colors hover:bg-neo-cream/10 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime"
        >
          <Crown className="size-4 text-neo-yellow" aria-hidden="true" />
          <span className="max-sm:sr-only">{t('eduPlans.cap.cta')}</span>
        </Link>
      ) : null}
    </div>
  );
}

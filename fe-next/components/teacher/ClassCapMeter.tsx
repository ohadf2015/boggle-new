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
        'flex flex-col gap-2.5 rounded-neo border-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4',
        full ? 'border-neo-yellow bg-neo-yellow/10' : 'border-neo-cream/30 bg-neo-navy-light',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-neo-cream">
          {full ? t('eduPlans.cap.full', { limit }) : t('eduPlans.cap.used', { count, limit })}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(count, limit)}
          aria-label={t('eduPlans.cap.label')}
          className="mt-1.5 flex gap-1"
        >
          {Array.from({ length: limit }, (_, i) => (
            <span key={i} className={cn('h-2 flex-1 rounded-full border border-neo-black', i < count ? (full ? 'bg-neo-yellow' : 'bg-neo-cream') : 'bg-neo-cream/15')} />
          ))}
        </div>
      </div>
      {full ? (
        <Link
          href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
          data-testid="class-cap-cta"
          onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'class_cap_meter' })}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-yellow px-3 font-neo-display text-sm font-black text-neo-navy shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          <Crown className="size-4" aria-hidden="true" />
          {t('eduPlans.cap.cta')}
        </Link>
      ) : null}
    </div>
  );
}

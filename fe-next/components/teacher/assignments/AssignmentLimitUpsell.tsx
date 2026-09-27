'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TEACHER_PRO_PRICE_USD, FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { Button } from '@/components/ui/button';

interface AssignmentLimitUpsellProps {
  currentCount: number;
  /** "Continue with free tier" — closes the dialog. The free path stays playable. */
  onClose: () => void;
}

/**
 * The soft paywall shown inside AssignmentCreator when a free teacher at the
 * assignment cap opens the create flow. Rendered in place of the form — the
 * dialog's single chokepoint, so every entry (checklist, tracking panel,
 * dashboard button) hits the same gate.
 *
 * Upgrade goes through /{locale}/teacher/upgrade, the one page that POSTs
 * /api/subscription/checkout (live Polar). Do not POST checkout from here —
 * a second handler drifts on 401/503 (ClassLimitUpsellModal's history).
 */
export function AssignmentLimitUpsell({ currentCount, onClose }: AssignmentLimitUpsellProps) {
  const { t, language } = useLanguage();

  return (
    <div data-testid="assignment-limit-upsell" className="space-y-4">
      <div className="rounded-neo border-2 border-neo-cream/40 bg-neo-cream/10 p-4">
        <div className="mb-2 flex items-center gap-3">
          <Zap className="h-5 w-5 shrink-0 text-neo-lime" aria-hidden="true" />
          <p className="font-bold text-neo-white">
            {t('teacher.subscription.assignmentLimitMessage', {
              current: currentCount,
              limit: FREE_TIER_LIMITS.assignmentsPerClass,
            })}
          </p>
        </div>
        <p className="text-sm font-bold leading-relaxed text-neo-white/70">
          {t('teacher.subscription.upgradeProDescription')}
        </p>
      </div>

      <div className="rounded-neo border-2 border-neo-cream/40 bg-neo-cream/10 p-4">
        <p className="text-sm font-bold text-neo-white/70">{t('teacher.subscription.priceUSD')}</p>
        <p className="font-neo-display text-3xl font-black text-neo-lime">
          ${TEACHER_PRO_PRICE_USD}{' '}
          <span className="text-lg font-bold text-neo-white/60">
            {t('teacher.subscription.perMonth')}
          </span>
        </p>
        <p className="mt-2 text-xs font-bold text-neo-white/50">
          {t('teacher.subscription.autoRenew')}
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          asChild
          className="flex-1 bg-neo-lime font-black text-neo-navy shadow-hard hover:-translate-y-0.5"
        >
          <Link
            href={`/${language}/teacher/upgrade`}
            onClick={() =>
              trackGrowthEvent('landing_cta_clicked', {
                cta: 'teacher_pro',
                source: 'assignment_limit_upsell',
              })
            }
          >
            {t('teacher.subscription.upgradeNow')}
          </Link>
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1 border-2 border-neo-cream/40 bg-transparent font-black text-neo-white hover:bg-neo-cream/10"
        >
          {t('teacher.subscription.continueFree')}
        </Button>
      </div>
    </div>
  );
}

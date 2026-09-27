'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import type { TeacherUsagePromptReason } from '@/lib/education/teacherUsagePrompt';
import { trackGrowthEvent } from '@/utils/growthTracking';

interface TeacherProUsagePromptCardProps {
  /** Which usage limit was hit — decides the copy block. */
  reason: TeacherUsagePromptReason;
  /** The number behind the reason (roster size or created-assignment count). */
  count: number;
  onDismiss?: () => void;
}

/**
 * The usage-triggered Pro ask: a card on the dashboard rail, shown when a
 * free teacher hits a real usage limit (10+ students in a class, or 3+
 * assignments created in one). Milestone + entitlement decide WHETHER this
 * mounts; dismiss is the teacher's "not now".
 *
 * Hits the existing checkout path only: /{locale}/teacher/upgrade owns the
 * POST to /api/subscription/checkout (live Polar, Teacher Pro $9/mo). Do not
 * POST checkout from this card — ClassLimitUpsellModal already taught us a
 * second handler drifts on 401/503 (PR #894 / t_b7c3dde7).
 */
export function TeacherProUsagePromptCard({
  reason,
  count,
  onDismiss,
}: TeacherProUsagePromptCardProps) {
  const { t, language } = useLanguage();

  useEffect(() => {
    trackGrowthEvent('iap_viewed', {
      product: 'teacher_pro',
      source: `usage_prompt_${reason}`,
      event_type: 'impression',
    });
  }, [reason]);

  return (
    <aside
      data-testid="teacher-pro-usage-prompt"
      className="rounded-neo border-3 border-black bg-neo-lime p-4 shadow-hard"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-neo-display font-black text-neo-navy text-lg leading-tight">
          {t('teacher.subscription.usagePromptTitle')}
        </h3>
        {onDismiss ? (
          <button
            type="button"
            data-testid="teacher-pro-usage-prompt-dismiss"
            onClick={onDismiss}
            aria-label={t('common.close')}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-lime text-neo-navy hover:bg-neo-navy hover:text-neo-lime focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-navy"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-sm font-neo-body font-bold leading-relaxed text-neo-navy/80">
        {reason === 'students'
          ? t('teacher.subscription.usagePromptStudentsBody', { count })
          : t('teacher.subscription.usagePromptAssignmentsBody', { count })}
      </p>

      <p className="mt-3 font-neo-display font-black text-neo-navy">
        ${TEACHER_PRO_PRICE_USD}
        <span className="text-sm font-bold text-neo-navy/70">
          {t('teacher.subscription.perMonth')}
        </span>
      </p>

      <Link
        href={`/${language}/teacher/upgrade`}
        data-testid="teacher-pro-usage-prompt-cta"
        className="mt-3 inline-flex w-full items-center justify-center rounded-neo bg-neo-navy px-5 py-3 font-neo-display font-black text-sm text-neo-lime border-neo border-neo-cream/40 shadow-hard transition-shadow hover:shadow-hard-lg"
        onClick={() =>
          trackGrowthEvent('landing_cta_clicked', {
            cta: 'teacher_pro',
            source: `usage_prompt_${reason}`,
          })
        }
      >
        {t('teacher.subscription.upgradeNow')}
      </Link>
    </aside>
  );
}

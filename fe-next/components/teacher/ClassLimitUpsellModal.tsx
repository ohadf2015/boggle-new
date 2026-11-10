'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD, FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import {
  goToPolarCheckout,
  postTeacherProCheckout,
  checkoutFailureKey,
} from '@/lib/education/postTeacherProCheckout';
import {
  trackTeacherPlanGateShown,
  trackTeacherPlanGateUpgradeClick,
} from '@/lib/education/proFunnelTelemetry';
import { teacherProUpgradeCtaLabel } from '@/components/education/TeacherProCheckoutCta';
import { Dialog } from '@/components/ui/dialog';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_BLOCK, NB_LINK, NB_PANEL, NB_PRIMARY, NB_SECONDARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { ProFeaturePreview } from '@/components/teacher/pro/ProFeaturePreview';

export type PlanGateLimitType = 'classrooms' | 'students';

interface ClassLimitUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  limit: number | null;
  /**
   * Why the ask is up. 'class_limit' (default) / 'student_limit' are hard
   * usage walls. 'trial_expired' is a nudge with a "continue free" escape.
   */
  reason?: 'class_limit' | 'student_limit' | 'trial_expired';
  /** Trial-expired variant only: dismiss the ask and continue into the create wizard. */
  onContinueFree?: () => void;
}

function gateArgs(
  reason: 'class_limit' | 'student_limit' | 'trial_expired',
): { surface: 'classroom_create' | 'student_enroll'; limit_type: PlanGateLimitType } {
  if (reason === 'student_limit') {
    return { surface: 'student_enroll', limit_type: 'students' };
  }
  return { surface: 'classroom_create', limit_type: 'classrooms' };
}

export default function ClassLimitUpsellModal({
  isOpen,
  onClose,
  currentCount,
  limit,
  reason = 'class_limit',
  onContinueFree,
}: ClassLimitUpsellModalProps) {
  const { t, language } = useLanguage();
  const isTrialExpired = reason === 'trial_expired';
  const isStudentLimit = reason === 'student_limit';
  const source = isTrialExpired ? 'trial_expired' : isStudentLimit ? 'student_limit' : 'class_limit';
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    trackGrowthEvent('iap_viewed', {
      source,
      currentCount,
      limit,
    });
    if (!isTrialExpired) {
      try {
        trackTeacherPlanGateShown(gateArgs(reason));
      } catch {
        /* analytics must never block the till */
      }
    }
  }, [isOpen, currentCount, limit, source, isTrialExpired, reason]);

  const startPolarCheckout = useCallback(async () => {
    if (pending) return;
    try {
      trackTeacherPlanGateUpgradeClick(gateArgs(reason));
    } catch {
      /* analytics must never block the till */
    }
    trackGrowthEvent('landing_cta_clicked', {
      cta: 'teacher_pro',
      source: isStudentLimit ? 'student_limit_modal' : 'class_limit_modal',
    });
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, { trial: false, locale: language, placement: `${source}_modal` });
      if (!result.ok) {
        toast.error(t(checkoutFailureKey(result)));
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [pending, reason, isStudentLimit, language, t, source]);

  const titleKey = isTrialExpired
    ? 'teacher.subscription.trialExpiredTitle'
    : isStudentLimit
      ? 'teacher.subscription.studentLimitTitle'
      : 'teacher.subscription.classLimitTitle';

  const message = isTrialExpired
    ? t('teacher.subscription.trialExpiredMessage')
    : isStudentLimit
      ? t('teacher.subscription.studentLimitMessage', {
          current: currentCount,
          limit: limit ?? FREE_TIER_LIMITS.studentsPerClass,
        })
      : t('teacher.subscription.classLimitMessage', {
          current: currentCount,
          limit: limit ?? FREE_TIER_LIMITS.classes,
        });

  const upgradeClass = cn(NB_PRIMARY, 'cursor-pointer');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <NbDialogContent size="sm" noDescription>
        <NbDialogHeader
          color="cyan"
          icon={<Zap className="size-6" strokeWidth={3} aria-hidden="true" />}
          title={t(titleKey)}
          closeLabel={t('common.close')}
        />
        <NbDialogBody className="space-y-4">
          <div className={cn(NB_PANEL, 'p-4')}>
            <p className="font-neo-display text-lg font-black leading-snug">{message}</p>
            <p className="mt-1 font-neo-body text-sm font-semibold leading-relaxed text-neo-cream/80">
              {t('teacher.subscription.upgradeProDescription')}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-neo-display text-lg font-black text-neo-cream">
              {t('teacher.subscription.proFeatures')}
            </h3>
            <div aria-hidden="true" className="pointer-events-none select-none">
              <ProFeaturePreview feature="analytics" />
            </div>
            <ul className="flex flex-wrap gap-2">
              {['teacher.subscription.unlimitedClasses'].map((key) => (
                <li key={key} className={cn(NB_STICKER, NB_BLOCK.lime, 'text-sm')}>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          <p className="flex flex-wrap items-baseline gap-x-2 font-neo-body text-sm font-bold text-neo-cream/80">
            <span>{t('teacher.subscription.priceUSD')}</span>
            <span className="font-neo-display text-3xl font-black text-neo-cyan">${TEACHER_PRO_PRICE_USD}</span>
            <span>{t('teacher.subscription.perMonth')}</span>
            <span className="basis-full text-xs text-neo-cream/65">{t('teacher.subscription.autoRenew')}</span>
          </p>

          <p className="border-t-2 border-neo-cream/20 pt-3 text-center font-neo-body text-xs font-bold text-neo-cream/70">
            {t('education.landing.districtCta.title')} {t('education.landing.districtCta.body')}{' '}
            <Link
              href={`/${language}/education/for-schools`}
              onClick={() =>
                trackGrowthEvent('landing_cta_clicked', {
                  cta: 'district_upsell',
                  source: isStudentLimit ? 'student_limit_modal' : 'class_limit_modal',
                })
              }
              className={cn(NB_LINK, 'cursor-pointer text-xs')}
            >
              {t('education.landing.districtCta.button')}
            </Link>
          </p>
        </NbDialogBody>
        <NbDialogFooter>
          <button
            type="button"
            onClick={isTrialExpired && onContinueFree ? onContinueFree : onClose}
            className={cn(NB_SECONDARY, 'cursor-pointer')}
          >
            {isTrialExpired && onContinueFree ? t('teacher.subscription.continueFree') : t('common.cancel')}
          </button>
          {isTrialExpired ? (
            <Link
              href={`/${language}/teacher/upgrade`}
              onClick={() =>
                trackGrowthEvent('landing_cta_clicked', {
                  cta: 'teacher_pro',
                  source: 'trial_expired_modal',
                })
              }
              className={upgradeClass}
            >
              {t('teacher.subscription.upgradeNow')}
            </Link>
          ) : (
            <button
              type="button"
              data-testid="plan-gate-upgrade"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => {
                void startPolarCheckout();
              }}
              className={upgradeClass}
            >
              {pending ? t('common.loading') : teacherProUpgradeCtaLabel(language)}
            </button>
          )}
        </NbDialogFooter>
      </NbDialogContent>
    </Dialog>
  );
}

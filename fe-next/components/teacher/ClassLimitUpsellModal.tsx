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
import {
  beaconTeacherProUpgradeShown,
  beaconTeacherProUpgradeClicked,
} from '@/lib/education/teacherProUpgradeBeacon';
import { teacherProUpgradeCtaLabel } from '@/components/education/TeacherProCheckoutCta';
import Image from 'next/image';
import { Dialog } from '@/components/ui/dialog';
import { BarChart3, School, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_BLOCK, NB_LINK, NB_PANEL, NB_PRIMARY, NB_SECONDARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';

/** Light Education classroom hero, generated with Higgsfield. No baked-in text. */
export const TEACHER_PRO_UPSELL_HERO = {
  src: '/images/education/teacher-pro-upsell-hero.webp',
  width: 960,
  height: 537,
} as const;

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
      beaconTeacherProUpgradeShown({
        placement: `${source}_modal`,
        reason: 'free_tier_limit',
        count: currentCount,
        limit,
        locale: language,
      });
    }
  }, [isOpen, currentCount, limit, source, isTrialExpired, reason, language]);

  const startPolarCheckout = useCallback(async () => {
    if (pending) return;
    try {
      trackTeacherPlanGateUpgradeClick(gateArgs(reason));
    } catch {
      /* analytics must never block the till */
    }
    if (!isTrialExpired) {
      beaconTeacherProUpgradeClicked({
        placement: `${source}_modal`,
        reason: 'free_tier_limit',
        count: currentCount,
        limit,
        locale: language,
      });
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
  }, [pending, reason, isStudentLimit, isTrialExpired, currentCount, limit, language, t, source]);

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
  const benefits = [
    { icon: School, label: t('teacher.subscription.featureOutcome1') },
    { icon: BarChart3, label: t('teacher.subscription.featureOutcome3') },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <NbDialogContent
        size="sm"
        noDescription
        data-edu-theme="sky"
        data-testid="teacher-pro-upsell"
        className="bg-edu-surface text-edu-ink"
      >
        <NbDialogHeader
          color="cyan"
          icon={<Zap className="size-6" strokeWidth={3} aria-hidden="true" />}
          title={t(titleKey)}
          closeLabel={t('common.close')}
        />
        <NbDialogBody className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain sm:space-y-4">
          <div className="overflow-hidden rounded-neo border-[3px] border-edu-line shadow-edu-lip-sm">
            <Image
              src={TEACHER_PRO_UPSELL_HERO.src}
              alt={t('teacher.subscription.upsellHeroAlt')}
              width={TEACHER_PRO_UPSELL_HERO.width}
              height={TEACHER_PRO_UPSELL_HERO.height}
              className="h-auto w-full max-h-[5.5rem] object-cover object-center [@media(min-height:44rem)]:max-h-36 sm:[@media(min-height:44rem)]:max-h-44"
              sizes="(max-width: 28rem) 100vw, 28rem"
              priority
            />
          </div>

          <div className={cn(NB_PANEL, 'bg-edu-tile p-3 sm:p-4')}>
            <p className="font-neo-display text-base font-black leading-snug sm:text-lg">{message}</p>
            <p className="mt-1 hidden font-neo-body text-sm font-semibold leading-relaxed text-edu-ink/80 [@media(min-height:44rem)]:block">
              {t('teacher.subscription.upgradeProDescription')}
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-2 [@media(max-height:41.24rem)]:hidden">
            {benefits.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className={cn(NB_STICKER, NB_BLOCK.lime, 'h-auto min-h-0 w-full flex-col items-center justify-center gap-1 whitespace-normal px-1.5 py-2 text-center text-[11px] leading-tight')}
              >
                <Icon className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

        </NbDialogBody>
        <NbDialogFooter className="flex flex-col items-stretch gap-2 bg-edu-surface sm:flex-col sm:gap-3">
          <p className="flex flex-wrap items-baseline justify-center gap-x-2 font-neo-body text-sm font-bold text-edu-ink/80">
            <span>{t('teacher.subscription.priceUSD')}</span>
            <span className="font-neo-display text-2xl font-black text-edu-cyan-ink sm:text-3xl">${TEACHER_PRO_PRICE_USD}</span>
            <span>{t('teacher.subscription.perMonth')}</span>
            <span className="basis-full text-center text-xs text-edu-ink/65">{t('teacher.subscription.autoRenew')}</span>
          </p>
          <p className="text-center font-neo-body text-xs font-bold leading-snug text-edu-ink/70">
            {t('education.landing.districtCta.title')} {t('education.landing.districtCta.body')}{' '}
            <Link
              href={`/${language}/education/for-schools`}
              onClick={() =>
                trackGrowthEvent('landing_cta_clicked', {
                  cta: 'district_upsell',
                  source: isStudentLimit ? 'student_limit_modal' : 'class_limit_modal',
                })
              }
              className={cn(NB_LINK, 'inline min-h-0 cursor-pointer px-0 text-xs')}
            >
              {t('education.landing.districtCta.button')}
            </Link>
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
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
          </div>
        </NbDialogFooter>
      </NbDialogContent>
    </Dialog>
  );
}

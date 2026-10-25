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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, Zap } from 'lucide-react';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Light-only surface: dark: variants are pinned to the light values on purpose
          (.claude/rules/60-recurring-pitfalls.md Class 5) — every child sets text-black. */}
      <DialogContent
        className="sm:max-w-md bg-neo-cream dark:bg-neo-cream text-black dark:text-black border-3 border-black shadow-hard-lg rounded-neo overflow-hidden p-0"
        hideCloseButton
      >
          <div className="bg-neo-cyan px-6 py-4 border-b-3 border-black flex items-center justify-between">
            <DialogTitle className="text-2xl font-neo-display font-black normal-case text-black">
              {t(titleKey)}
            </DialogTitle>
            <DialogClose asChild>
              <button
                className="cursor-pointer text-black hover:bg-black/10 p-1 rounded transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </DialogClose>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-neo-pink/20 border-2 border-neo-cream/40 rounded-neo p-4">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-black flex-shrink-0" />
                <p className="font-bold text-black">{message}</p>
              </div>
              <p className="text-sm text-black/70 font-bold leading-relaxed">
                {t('teacher.subscription.upgradeProDescription')}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-neo-display font-black text-black text-lg">
                {t('teacher.subscription.proFeatures')}
              </h3>
              <div aria-hidden="true" className="pointer-events-none select-none">
                <ProFeaturePreview feature="analytics" />
              </div>
              <ul className="flex flex-wrap gap-2 text-sm">
                {['teacher.subscription.unlimitedClasses', 'teacher.subscription.unlimitedStudents'].map((key) => (
                  <li key={key} className="rounded-neo border-2 border-black bg-neo-lime px-2 py-0.5 font-bold text-black">
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-2 border-black rounded-neo p-4 bg-white">
              <p className="text-sm font-bold text-black/70">
                {t('teacher.subscription.priceUSD')}
              </p>
              <p className="text-3xl font-neo-display font-black text-neo-cyan">
                ${TEACHER_PRO_PRICE_USD}{' '}
                <span className="text-lg text-black/60 font-bold">
                  {t('teacher.subscription.perMonth')}
                </span>
              </p>
              <p className="text-xs font-bold text-black/50 mt-2">
                {t('teacher.subscription.autoRenew')}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              {isTrialExpired ? (
                <Button
                  asChild
                  className="flex-1 cursor-pointer bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
                >
                  <Link
                    href={`/${language}/teacher/upgrade`}
                    onClick={() =>
                      trackGrowthEvent('landing_cta_clicked', {
                        cta: 'teacher_pro',
                        source: 'trial_expired_modal',
                      })
                    }
                  >
                    {t('teacher.subscription.upgradeNow')}
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  data-testid="plan-gate-upgrade"
                  disabled={pending}
                  aria-busy={pending || undefined}
                  onClick={() => {
                    void startPolarCheckout();
                  }}
                  className="flex-1 cursor-pointer bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all disabled:opacity-60"
                >
                  {pending ? t('common.loading') : teacherProUpgradeCtaLabel(language)}
                </Button>
              )}
              <Button
                onClick={isTrialExpired && onContinueFree ? onContinueFree : onClose}
                variant="outline"
                className="flex-1 cursor-pointer border-2 border-black bg-neo-cream text-black font-black shadow-hard hover:-translate-y-0.5 transition-all"
              >
                {isTrialExpired && onContinueFree
                  ? t('teacher.subscription.continueFree')
                  : t('common.cancel')}
              </Button>
            </div>

            <div className="border-t-2 border-black/10 pt-4 text-center">
              <p className="text-xs font-bold text-black/60">
                {t('education.landing.districtCta.title')} {t('education.landing.districtCta.body')}
              </p>
              <Link
                href={`/${language}/education/for-schools`}
                onClick={() =>
                  trackGrowthEvent('landing_cta_clicked', {
                    cta: 'district_upsell',
                    source: isStudentLimit ? 'student_limit_modal' : 'class_limit_modal',
                  })
                }
                className="mt-1 inline-block cursor-pointer text-sm font-black text-neo-purple underline underline-offset-2 hover:text-black"
              >
                {t('education.landing.districtCta.button')}
              </Link>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

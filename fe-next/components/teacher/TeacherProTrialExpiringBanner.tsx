'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft, polarTrialDaysTitle, isPolarTrialDay10Expiring } from '@/lib/education/polarTrial';
import posthog from '@/lib/analytics/lazyPosthog';
import { trackTeacherTrialBannerShown, trackTeacherTrialUpgradeClicked } from '@/lib/education/proFunnelTelemetry';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';
import { PRO_BANNER_CTA, ProBanner, ProShine } from './pro/ProBanner';
import { TeacherProManageLink } from './TeacherProManageLink';
import { TrialUsageRecap } from './pro/TrialUsageRecap';

type Capture = (event: string, props?: Record<string, unknown>) => void;

function safeCapture(event: string, props: Record<string, unknown>): void {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch {
    /* analytics must never block user action or throw */
  }
}

const MANAGE_QUIET =
  'self-center text-xs font-bold text-neo-cream/70 underline underline-offset-2 transition-colors hover:text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan sm:self-end';

interface TeacherProTrialExpiringBannerProps {
  trialExpires: string | null;
  portalUrl?: string | null;
  onDismiss?: () => void;
}

/**
 * URGENT variant of the trial-status banner: the last days of a card trial on
 * Teacher HQ (4 or fewer days left, day 10 of 14), pink-toned and dismissible.
 *
 * The trial converts to $9/mo on the card they added, so the banner says when,
 * leads with an upgrade CTA to the Pro checkout path, and keeps the Polar
 * portal as the quiet manage/cancel secondary. It never starts a paid checkout,
 * which for a teacher already trialing is a second subscription.
 *
 * Fires `teacher_trial_banner_shown` (urgent: true at <=3 days) once per
 * display with `days_remaining`, next to the legacy
 * `teacher_trial_expiring_shown`; the CTA tap fires
 * `teacher_trial_upgrade_clicked` with `days_remaining`.
 */
export function TeacherProTrialExpiringBanner({
  trialExpires,
  portalUrl = null,
  onDismiss,
}: TeacherProTrialExpiringBannerProps) {
  const { t, language } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const [isDismissed, setIsDismissed] = useState(false);
  const shownRef = useRef(false);

  const daysRemaining = polarTrialDaysLeft(trialExpires, nowMs);
  const isExpiring = isPolarTrialDay10Expiring(daysRemaining);

  useEffect(() => {
    if (!isExpiring || isDismissed) return;
    if (shownRef.current) return;
    shownRef.current = true;
    safeCapture('teacher_trial_expiring_shown', { days_remaining: daysRemaining });
    trackTeacherTrialBannerShown({ days_remaining: daysRemaining ?? 0, urgent: (daysRemaining ?? 0) <= 3 });
  }, [isExpiring, isDismissed, daysRemaining]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (daysRemaining === null || !isExpiring || isDismissed) {
    return null;
  }

  const urgent = daysRemaining <= 3;

  return (
    <ProBanner
      testId="teacher-pro-trial-expiring"
      data={{ 'data-days': String(daysRemaining) }}
      tone="urgent"
      proLabel={t('eduShell.nav.pro')}
      title={polarTrialDaysTitle(t, daysRemaining)}
      body={
        <>
          <span>{t('teacher.subscription.trialAutoRenewBody')}</span>
          <TrialUsageRecap trialExpires={trialExpires} />
        </>
      }
      onDismiss={handleDismiss}
      dismissLabel={t('common.close')}
      dismissTestId="teacher-pro-trial-expiring-dismiss"
      action={
        <div className="flex flex-col gap-2 max-sm:w-full">
          <Link
            href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}?source=dashboard_trial_lifecycle`}
            data-testid="teacher-pro-trial-expiring-upgrade-cta"
            onClick={() => {
              try {
                trackTeacherTrialUpgradeClicked({ days_remaining: daysRemaining, urgent });
              } catch {
                /* analytics must never block the money path */
              }
            }}
            className={PRO_BANNER_CTA}
          >
            <ProShine />
            {t('teacher.subscription.upgradeNow')}
          </Link>
          <TeacherProManageLink
            portalUrl={portalUrl}
            testId="teacher-pro-trial-expiring-cta"
            className={MANAGE_QUIET}
          >
            {t('teacher.subscription.trialManageCta')}
          </TeacherProManageLink>
        </div>
      }
    />
  );
}

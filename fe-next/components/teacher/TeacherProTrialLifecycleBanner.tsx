'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  polarTrialCountdown,
  polarTrialDaysLeft,
  polarTrialDaysTitle,
} from '@/lib/education/polarTrial';
import {
  trackTeacherTrialBannerShown,
  trackTeacherTrialUpgradeClicked,
} from '@/lib/education/proFunnelTelemetry';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';
import { PRO_BANNER_CTA, ProBanner, ProCountdownTile, ProShine } from './pro/ProBanner';
import { TeacherProManageLink } from './TeacherProManageLink';

/** <=3 days left is the urgent variant (pink tile + stripe). */
const URGENT_DAYS = 3;

const MANAGE_QUIET =
  'self-center text-xs font-bold text-neo-cream/70 underline underline-offset-2 transition-colors hover:text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan sm:self-end';

/**
 * Live Polar Teacher Pro trial on Teacher HQ: a countdown of days remaining,
 * an upgrade CTA to the Pro checkout path, and the Polar portal as the quiet
 * manage/cancel secondary. The <=3-days urgent variant gets the pink tone.
 *
 * The trial started with a card and converts to $9/mo on its own, so the CTA
 * LINKS to the plan/checkout surface instead of posting a new checkout — a
 * paid checkout for a trialing teacher is a second subscription. Distinct
 * from the access-trial `TrialUrgencyBanner`.
 *
 * Fires `teacher_trial_banner_shown` once per display and
 * `teacher_trial_upgrade_clicked` on CTA tap, both with `days_remaining`.
 */
export function TeacherProTrialLifecycleBanner({
  trialExpires,
  portalUrl = null,
}: {
  trialExpires: string | null;
  portalUrl?: string | null;
}) {
  const { t, language } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const shownRef = useRef(false);
  const daysLeft = polarTrialDaysLeft(trialExpires, nowMs);
  const urgent = daysLeft !== null && daysLeft <= URGENT_DAYS;

  useEffect(() => {
    if (daysLeft === null || shownRef.current) return;
    shownRef.current = true;
    trackTeacherTrialBannerShown({ days_remaining: daysLeft, urgent });
  }, [daysLeft, urgent]);

  const countdown = polarTrialCountdown(trialExpires, nowMs, language);
  const upgradeHref = `/${language}${TEACHER_PRO_CHECKOUT_PATH}?source=dashboard_trial_lifecycle`;

  return (
    <ProBanner
      testId="teacher-pro-trial-lifecycle"
      data={{ 'data-days': daysLeft === null ? '' : String(daysLeft) }}
      tone={urgent ? 'urgent' : 'calm'}
      proLabel={t('eduShell.nav.pro')}
      lead={
        countdown ? (
          <ProCountdownTile count={countdown.count} unit={t(countdown.key)} tone={urgent ? 'urgent' : 'calm'} />
        ) : undefined
      }
      title={polarTrialDaysTitle(t, daysLeft)}
      body={t('teacher.subscription.trialAutoRenewBody')}
      action={
        <div className="flex flex-col gap-2 max-sm:w-full">
          <Link
            href={upgradeHref}
            data-testid="teacher-pro-trial-lifecycle-upgrade-cta"
            onClick={() => {
              try {
                trackTeacherTrialUpgradeClicked({ days_remaining: daysLeft ?? 0, urgent });
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
            testId="teacher-pro-trial-lifecycle-manage"
            className={MANAGE_QUIET}
          >
            {t('teacher.subscription.trialManageCta')}
          </TeacherProManageLink>
        </div>
      }
    />
  );
}

'use client';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrialRecapLine, type TrialRecap } from '@/components/education/TrialRecapLine';
import { trialCountdownUnit, type TrialStatus } from '@/lib/education/trial';
import {
  TEACHER_PRO_CHECKOUT_PATH,
  teacherProUpgradeCtaLabel,
} from '@/components/education/TeacherProCheckoutCta';
import { PRO_BANNER_CTA, ProBanner, ProCountdownTile, ProShine } from '@/components/teacher/pro/ProBanner';

// Activation-urgency banner for a teacher trial. Renders a live countdown and
// "start now / don't miss it" framing so approved teachers act before the
// window closes. Soft model: access is not revoked, so the expired state nudges
// renewal rather than blocking.
//
// The dashboard upgrade path passes `onDismiss` + a checkout href: last-7-days
// teachers get a dismissible days-remaining card whose CTA is Polar checkout,
// not "start your first class".
interface Props {
  trial: TrialStatus | null;
  /** Where the primary CTA points (defaults to the locale teacher dashboard). */
  href?: string;
  /** When set, the active-trial card is dismissible (dashboard 7-day nudge). */
  onDismiss?: () => void;
  /** Override the active-trial CTA label (dashboard uses "Upgrade to Teacher Pro"). */
  ctaLabel?: string;
  /** Expired state only: real games and students from the last 30 days. */
  recap?: TrialRecap | null;
}

export function TrialUrgencyBanner({ trial, href, onDismiss, ctaLabel, recap }: Props) {
  const { t, language } = useLanguage();
  if (!trial) return null;

  const checkoutHref = `/${language}${TEACHER_PRO_CHECKOUT_PATH}`;
  const target = href || `/${language}/teacher`;
  const upgradeLabel = ctaLabel ?? teacherProUpgradeCtaLabel(language);
  const dateStr = new Date(trial.expiresAt).toLocaleDateString(language, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // ---- Expired: trial ended, soft nudge to renew. ----
  if (trial.isExpired) {
    return (
      <ProBanner
        testId="trial-urgency-banner"
        role="status"
        tone="urgent"
        proLabel={t('eduShell.nav.pro')}
        title={<span data-testid="trial-title">{t('education.trial.expired_title')}</span>}
        body={t('teacher.subscription.upgradeProDescription')}
        action={
          <Link href={checkoutHref} className={PRO_BANNER_CTA}>
            <ProShine />
            {t('teacher.subscription.upgradeNow')}
          </Link>
        }
      >
        <TrialRecapLine recap={recap} className="mt-1 font-neo-body text-sm font-black text-neo-cream" />
        <p data-testid="trial-expired-kept" className="mt-1 font-neo-body text-sm font-semibold text-neo-cream/70">
          {t('education.trial.expired_kept')}
        </p>
      </ProBanner>
    );
  }

  // ---- Active: countdown + urgency. Final day counts down in hours. ----
  const { key: unitKey, count } = trialCountdownUnit(trial, language);
  const titleKey = trial.isUrgent ? 'education.trial.urgent_title' : 'education.trial.title';
  const tone = trial.isUrgent ? 'urgent' : 'calm';
  const isUpgradeNudge = Boolean(onDismiss) || Boolean(ctaLabel);
  const ctaHref = isUpgradeNudge ? checkoutHref : target;
  const ctaText = isUpgradeNudge ? upgradeLabel : t('education.trial.cta');

  return (
    <ProBanner
      testId="trial-urgency-banner"
      role="status"
      tone={tone}
      proLabel={t('eduShell.nav.pro')}
      lead={<ProCountdownTile count={count} unit={t(unitKey)} tone={tone} />}
      title={<span data-testid="trial-title">{t(titleKey)}</span>}
      body={t('education.trial.body', { date: dateStr, days: trial.daysLeft })}
      onDismiss={onDismiss}
      dismissLabel={t('common.close')}
      dismissTestId="trial-urgency-banner-dismiss"
      action={
        <Link href={ctaHref} data-testid="trial-urgency-banner-cta" className={PRO_BANNER_CTA}>
          <ProShine />
          {ctaText}
        </Link>
      }
    />
  );
}

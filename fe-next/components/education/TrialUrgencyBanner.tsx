'use client';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trialCountdownUnit, type TrialStatus } from '@/lib/education/trial';
import {
  TEACHER_PRO_CHECKOUT_PATH,
  teacherProUpgradeCtaLabel,
} from '@/components/education/TeacherProCheckoutCta';

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
}

export function TrialUrgencyBanner({ trial, href, onDismiss, ctaLabel }: Props) {
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
      <div
        data-testid="trial-urgency-banner"
        role="status"
        className="rounded-neo border-neo bg-neo-pink p-4 text-neo-white shadow-hard"
      >
        <h3 data-testid="trial-title" className="text-lg font-black font-neo-display">
          {t('education.trial.expired_title')}
        </h3>
        <p className="mt-1 text-sm">{t('teacher.subscription.upgradeProDescription')}</p>
        {/* The expired CTA used to point at /education/access — the free access
            request form, which auto-approves. So the one screen where a teacher
            has just lost something sent them to ask for more free access instead
            of to the $9/mo page, and nothing in the product ever asked for the
            money. Both strings already exist in every locale. */}
        <Link
          href={checkoutHref}
          className="mt-3 inline-block rounded-neo bg-neo-navy px-4 py-2 font-bold text-neo-white border-neo border-neo-cream/40 shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all"
        >
          {t('teacher.subscription.upgradeNow')}
        </Link>
      </div>
    );
  }

  // ---- Active: countdown + urgency. Final day counts down in hours. ----
  const { key: unitKey, count } = trialCountdownUnit(trial);
  const titleKey = trial.isUrgent ? 'education.trial.urgent_title' : 'education.trial.title';
  const tone = trial.isUrgent ? 'bg-neo-pink text-neo-white' : 'bg-neo-lime text-neo-navy';
  const isUpgradeNudge = Boolean(onDismiss) || Boolean(ctaLabel);
  const ctaHref = isUpgradeNudge ? checkoutHref : target;
  const ctaText = isUpgradeNudge ? upgradeLabel : t('education.trial.cta');

  return (
    <div
      data-testid="trial-urgency-banner"
      role="status"
      className={`rounded-neo border-neo p-4 shadow-hard ${tone}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="shrink-0 rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-3 py-2 text-center text-neo-white shadow-hard-sm">
            <div data-testid="trial-count" className="text-2xl font-black font-neo-display leading-none">
              {count}
            </div>
            <div data-testid="trial-unit" className="mt-0.5 text-[10px] font-bold uppercase tracking-wide">
              {t(unitKey)}
            </div>
          </div>
          <div className="min-w-0">
            <h3 data-testid="trial-title" className="text-lg font-black font-neo-display">
              {t(titleKey)}
            </h3>
            <p className="mt-0.5 text-sm font-semibold">
              {t('education.trial.body', { date: dateStr, days: trial.daysLeft })}
            </p>
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            data-testid="trial-urgency-banner-dismiss"
            onClick={onDismiss}
            aria-label={t('common.close')}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-lime text-neo-navy hover:bg-neo-navy hover:text-neo-lime focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-navy"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <Link
        href={ctaHref}
        data-testid="trial-urgency-banner-cta"
        className="mt-3 inline-block rounded-neo bg-neo-navy px-4 py-2 font-bold text-neo-white border-neo border-neo-cream/40 shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all"
      >
        {ctaText}
      </Link>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TrialStatus } from '@/lib/education/trial';

// Activation-urgency banner for a teacher trial. Renders a live countdown and
// "start now / don't miss it" framing so approved teachers act before the
// window closes. Soft model: access is not revoked, so the expired state nudges
// renewal rather than blocking.
interface Props {
  trial: TrialStatus | null;
  /** Where the primary CTA points (defaults to the locale teacher dashboard). */
  href?: string;
}

export function TrialUrgencyBanner({ trial, href }: Props) {
  const { t, language } = useLanguage();
  if (!trial) return null;

  const target = href || `/${language}/teacher`;
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
        <p className="mt-1 text-sm">{t('education.trial.expired_body')}</p>
        {/* The expired CTA points to upgrade, giving the teacher a clear path
            to keep their classroom access after the free trial window closes. */}
        <Link
          href={`/${language}/teacher/upgrade`}
          className="mt-3 inline-block rounded-neo bg-neo-navy px-4 py-2 font-bold text-neo-white border-neo shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all"
        >
          {t('teacher.subscription.upgradeNow')}
        </Link>
      </div>
    );
  }

  // ---- Active: countdown + urgency. Final day counts down in hours. ----
  const finalDay = trial.daysLeft <= 1;
  const count = finalDay ? trial.hoursLeft : trial.daysLeft;
  const unitKey = finalDay
    ? 'education.trial.hours_left'
    : trial.daysLeft === 1
      ? 'education.trial.day_left'
      : 'education.trial.days_left';
  const titleKey = trial.isUrgent ? 'education.trial.urgent_title' : 'education.trial.title';
  const tone = trial.isUrgent ? 'bg-neo-pink text-neo-white' : 'bg-neo-lime text-neo-navy';

  return (
    <div
      data-testid="trial-urgency-banner"
      role="status"
      className={`rounded-neo border-neo p-4 shadow-hard ${tone}`}
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0 rounded-neo border-neo bg-neo-navy px-3 py-2 text-center text-neo-white shadow-hard-sm">
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
      <Link
        href={target}
        className="mt-3 inline-block rounded-neo bg-neo-navy px-4 py-2 font-bold text-neo-white border-neo shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all"
      >
        {t('education.trial.cta')}
      </Link>
    </div>
  );
}

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { ProBanner } from './pro/ProBanner';
import { TeacherProManageLink } from './TeacherProManageLink';

const DATE_LOCALE: Record<string, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

/**
 * The day before a card trial converts: when, how much, and the one-tap way out.
 * No dismiss: it is up for at most a day and it is the in-app half of the
 * day-before notice (the email is the other half).
 */
export function TeacherProTrialChargeSoonBanner({
  chargeAt,
  portalUrl,
}: {
  chargeAt: string | null;
  portalUrl: string | null;
}) {
  const { t, language } = useLanguage();
  const parsed = chargeAt ? new Date(chargeAt) : null;
  const date =
    parsed && Number.isFinite(parsed.getTime())
      ? parsed.toLocaleDateString(DATE_LOCALE[language] || language || 'en-US', { month: 'long', day: 'numeric' })
      : '';

  return (
    <ProBanner
      testId="teacher-pro-trial-charge-soon"
      role="status"
      tone="urgent"
      proLabel={t('eduShell.nav.pro')}
      title={t('teacher.subscription.trialChargeSoonTitle')}
      body={t('teacher.subscription.trialChargeSoonBody', { date })}
      action={
        <TeacherProManageLink portalUrl={portalUrl} testId="teacher-pro-trial-charge-soon-cta">
          {t('teacher.subscription.trialManageCta')}
        </TeacherProManageLink>
      }
    />
  );
}

'use client';

import { TeacherProCheckoutCta } from '@/components/education/TeacherProCheckoutCta';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isTeacherProfile } from '@/lib/education/teacherRole';

/**
 * Public money path for `/[locale]/teacher`.
 *
 * TeacherGate SSRs a loader (auth `loading: true`) then client-redirects
 * unsigned visitors to /education/access — so crawlers and share-traffic
 * never saw Teacher Pro. This block is a sibling of the gate: it always
 * paints on SSR, stays for unsigned visitors with the individual Pro CTA,
 * and swaps to a school/bulk-pricing link once a teacher profile resolves
 * (signed-in HQ has its own Pro upsell card — this is the only place a
 * signed-in teacher can reach the school-pricing lead form).
 */
export function PublicTeacherPayCta({ locale }: { locale: string }) {
  const { profile, loading } = useAuth();
  const { t } = useLanguage();

  if (!loading && isTeacherProfile(profile)) {
    return (
      <div
        data-testid="public-teacher-pay-cta"
        className="mx-auto w-full max-w-6xl px-4 py-4 text-center sm:px-6 lg:px-8"
      >
        <p className="text-sm text-edu-ink/70">
          {t('teacher.schoolBulkCta.text')}{' '}
          <a
            data-testid="school-bulk-pricing-link"
            data-ph-capture-attribute-cta="teacher_dashboard_school_bulk_pricing"
            href={`/${locale}/education/for-schools#lead`}
            className="font-bold text-edu-lime-ink underline"
          >
            {t('teacher.schoolBulkCta.link')}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="public-teacher-pay-cta"
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <TeacherProCheckoutCta locale={locale} />
    </div>
  );
}

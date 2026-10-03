'use client';

import { TeacherProCheckoutCta } from '@/components/education/TeacherProCheckoutCta';
import { useAuth } from '@/contexts/AuthContext';
import { isTeacherProfile } from '@/lib/education/teacherRole';

/**
 * Public money path for `/[locale]/teacher`.
 *
 * TeacherGate SSRs a loader (auth `loading: true`) then client-redirects
 * unsigned visitors to /education/access — so crawlers and share-traffic
 * never saw Teacher Pro. This block is a sibling of the gate: it always
 * paints on SSR, stays for unsigned visitors, and unmounts once a teacher
 * profile resolves (signed-in HQ till is a different card).
 */
export function PublicTeacherPayCta({ locale }: { locale: string }) {
  const { profile, loading } = useAuth();
  if (!loading && isTeacherProfile(profile)) return null;

  return (
    <div
      data-testid="public-teacher-pay-cta"
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <TeacherProCheckoutCta locale={locale} />
    </div>
  );
}

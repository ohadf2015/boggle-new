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
 * profile resolves (signed-in HQ has its own Pro card; school pricing lives on
 * the teacher profile). It is positioned below the fold, out of the body's flex
 * column: in flow it shrank the h-dvh app shell beside it and floated the tab bar.
 */
export function PublicTeacherPayCta({ locale }: { locale: string }) {
  const { profile, loading } = useAuth();
  if (!loading && isTeacherProfile(profile)) return null;

  return (
    <div
      data-testid="public-teacher-pay-cta"
      className="absolute inset-x-0 top-full mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <TeacherProCheckoutCta locale={locale} />
    </div>
  );
}

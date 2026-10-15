'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { EducationHero } from '@/components/education/EducationHero';
import { ProFramingSection } from '@/components/education/ProFramingSection';
import { TeacherProCheckoutCta } from '@/components/education/TeacherProCheckoutCta';
import { NoAccountCta } from '@/components/education/NoAccountCta';
import { LandingHeader } from '@/components/education/landing/LandingHeader';
import { LandingModes } from '@/components/education/landing/LandingModes';
import { LandingHowItWorks, type GeoAnswer } from '@/components/education/landing/LandingHowItWorks';
import { LandingSchoolLead } from '@/components/education/landing/LandingSchoolLead';
import { LandingFinalCta } from '@/components/education/landing/LandingFinalCta';
import { isTeacherProfile } from '@/lib/education/teacherRole';

/**
 * Teacher landing. Order: hero (start free, student join, the class moment) → how a class runs →
 * modes → the one Pro section → school quote → FAQ → close.
 * Approved teachers go to Teacher Home; everyone else sees the page, including signed-in
 * accounts without teacher access (every profile starts as `student`, so redirecting them
 * bounced players and fresh teacher signups to the student hub).
 */
export function PageClient({ geo, faq }: { geo?: GeoAnswer; faq?: ReactNode }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isAuthenticated, loading, profile } = useAuth();

  const hasTeacherAccess = isAuthenticated && !loading && isTeacherProfile(profile);
  const setupPending = isAuthenticated && !loading && !hasTeacherAccess;

  useEffect(() => {
    if (hasTeacherAccess) {
      router.replace(`/${language}/teacher`);
    }
  }, [hasTeacherAccess, language, router]);

  if (hasTeacherAccess) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neo-navy">
      <LandingHeader />
      {setupPending && (
        <p className="mx-auto max-w-6xl px-4 pt-3 text-end text-sm text-neo-cream/80 sm:px-6 lg:px-8">
          {t('eg2Land.studentNote')}{' '}
          <Link
            href={`/${language}/student`}
            data-testid="landing-student-classes-link"
            className="font-bold text-neo-cream underline underline-offset-2 hover:text-neo-white"
          >
            {t('eg2Land.studentLink')}
          </Link>
        </p>
      )}
      <EducationHero setupPending={setupPending} />
      <LandingHowItWorks geo={geo} />
      <LandingModes />
      <ProFramingSection cta={<TeacherProCheckoutCta locale={language} variant="inline" />} />
      <LandingSchoolLead />
      {faq}
      <LandingFinalCta setupPending={setupPending} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <NoAccountCta locale={language} compact />
      </div>
    </main>
  );
}

export default PageClient;

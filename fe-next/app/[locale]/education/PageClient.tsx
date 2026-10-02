'use client';
import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { EducationHero } from '@/components/education/EducationHero';
import { MoatTrifectaSection } from '@/components/education/MoatTrifectaSection';
import { ProFramingSection } from '@/components/education/ProFramingSection';
import { SixModeTour } from '@/components/education/SixModeTour';
import { ComparisonStrip } from '@/components/education/ComparisonStrip';
import { TeacherSetupSection } from '@/components/education/TeacherSetupSection';
import { EducationFAQ } from '@/components/education/EducationFAQ';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { NoAccountCta } from '@/components/education/NoAccountCta';
import { TeacherProCheckoutCta } from '@/components/education/TeacherProCheckoutCta';
import { isTeacherProfile } from '@/lib/education/teacherRole';

// Same modal every other surface opens; lazy because it is a modal nobody sees
// until they ask for it.
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

/**
 * Education Landing - Master page rebuilt with scroll reveals
 * Auth-aware: approved teachers go to the live lobby; students auto-redirect; anons see full marketing
 * Sections: Hero → Role Cards → Moat → Modes → Comparison → Setup → Pricing → FAQ
 * All scroll animations respect prefers-reduced-motion
 */

export function PageClient({ answer }: { answer?: ReactNode }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isAuthenticated, loading, profile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auto-redirect authenticated students to /student dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && profile?.user_role === 'student') {
      router.replace(`/${language}/student`);
    }
  }, [loading, isAuthenticated, profile?.user_role, language, router]);

  // Determine if user has teacher/admin access
  const hasTeacherAccess = isAuthenticated && !loading && isTeacherProfile(profile);

  // Approved teachers host from the live lobby. This page is the public catalog.
  useEffect(() => {
    if (hasTeacherAccess) {
      router.replace(`/${language}/education/classroom-game`);
    }
  }, [hasTeacherAccess, language, router]);

  // If student is redirecting, return null
  if (!loading && isAuthenticated && profile?.user_role === 'student') {
    return null;
  }

  if (hasTeacherAccess) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neo-navy">
      {/* Sign in. Every other CTA on this page is signup-flavoured ("Get Teacher
          Access", "Get Teacher Pro"), so a teacher who already HAS an account had
          to click through the create-account modal to find the sign-in link. */}
      {!isAuthenticated && (
        <div className="mx-auto flex w-full max-w-6xl justify-end px-4 pb-4 sm:px-6 lg:px-8">
          <button
            type="button"
            data-testid="education-sign-in"
            onClick={() => {
              trackGrowthEvent('landing_cta_clicked', { cta: 'education_sign_in' });
              setShowAuthModal(true);
            }}
            className="min-h-11 rounded-neo border-neo border-neo-cyan px-5 font-neo-body font-bold text-neo-cyan shadow-hard-sm transition-all hover:bg-neo-cyan/15 hover:shadow-hard focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime"
          >
            {t('auth.signIn')}
          </button>
        </div>
      )}
      {showAuthModal && (
        <AuthModal isOpen onClose={() => setShowAuthModal(false)} initialMode="signin" audience="teacher" />
      )}

      {/* Marketing landing: the pessimistic/safe default. `hasTeacherAccess` is
          `false` while `loading` is true, so this is what SSR and first paint
          render. An approved teacher returns null above and is sent to the
          live lobby; a redirecting student never sees it flash. */}
      {!hasTeacherAccess && (
        <>
          <EducationHero />
          {answer}

          {/* Role cards: one shared edge. The lime button is the only fill. */}
          <section className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Teacher card — PRIMARY path: hosts live games */}
              <div className="flex flex-col gap-4 rounded-neo border-2 border-neo-cream bg-neo-navy-light p-6">
                <div>
                  <h3 className="text-2xl font-neo-display font-black text-neo-cream">
                    {t('education.landing.teacher')}
                  </h3>
                  <p className="mt-3 text-neo-white">
                    {t('education.landing.teacherCta')}
                  </p>
                </div>
                <Link
                  href={`/${language}/education/access`}
                  data-testid="teacher-card-access-link"
                  onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'teacher_card_access' })}
                  className="self-start rounded-neo border-neo border-neo-black bg-neo-lime px-5 py-2.5 font-bold text-neo-navy transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 motion-reduce:transition-none"
                >
                  {t('education.landing.teacherLeadCta.button')}
                </Link>
                <Link
                  href={`/${language}/education/for-schools`}
                  data-testid="district-role-card-link"
                  onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'district_role_card' })}
                  className="self-start inline-flex items-center gap-1 text-sm font-bold text-neo-purple-light underline underline-offset-2 hover:text-neo-cream transition-colors"
                >
                  {t('education.landing.districtCta.title')}
                  <DirectionalIcon icon={ArrowRight} className="inline size-3.5" />
                </Link>
              </div>
              
              {/* Student card — SECONDARY path: join with a class code */}
              <div className="flex flex-col gap-4 rounded-neo border-2 border-neo-cream bg-neo-navy-light p-6">
                <div>
                  <h3 className="text-2xl font-neo-display font-black text-neo-cream">
                    {t('education.landing.student')}
                  </h3>
                  <p className="mt-3 text-neo-white">
                    {t('education.landing.studentCta')}
                  </p>
                </div>
                <Link
                  href={`/${language}/student/join`}
                  data-testid="student-card-join-link"
                  onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'student_card_join' })}
                  className="self-start text-base font-bold text-neo-cream underline decoration-2 underline-offset-4 hover:text-neo-white"
                >
                  {t('education.landing.studentJoinCta')}
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Checkout stays in the HTML for every visitor, including a signed-in
          free teacher whose marketing block unmounts. It follows the host/join
          decision so the first screen is the classroom, not the price. */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <TeacherProCheckoutCta locale={language} />
      </div>

      {!hasTeacherAccess && (
        <>
          <MoatTrifectaSection />
          {/* Pricing used to sit here, third, before a first-time visitor had seen
              what the product actually does — and it was the first of two upsells
              (this and DistrictUpsellStrip) shown to someone who has not signed up.
              Moved below the role cards so the order is: what it is → the modes →
              how it compares → pick your role → what it costs. */}
          <div id="modes">
            <SixModeTour />
          </div>
          <ComparisonStrip />
          {/* "…how it compares" used to hand straight over to "pick your role",
              which asked a teacher to commit before anyone had shown them what
              running a class actually involves. The steps were written, but
              only ever rendered behind TeacherGate. */}
          <TeacherSetupSection />

          {/* The guest "play now" path sent a teacher with no code to a
              student JOIN screen from the biggest button above the fold — a
              dead end, and a "no sign-up" promise contradicting the teacher
              signup one card over. It now sits after the setup steps, where it
              reads as what it is: the student side. */}
          <div className="mx-auto w-full max-w-6xl px-4 pb-2 sm:px-6 lg:px-8">
            <NoAccountCta locale={language} />
          </div>
        </>
      )}

      {/* Social proof for unauthenticated users */}
      {!hasTeacherAccess && (
        <section className="mx-auto max-w-3xl px-4 py-8 text-center">
          <p className="text-neo-white">
            {t('education.landing.socialProof')}
          </p>
        </section>
      )}

      {!hasTeacherAccess && (
        <>
          {/* Pricing lands here, after the visitor has chosen a role — not third
              on the page. See the note by SixModeTour above. */}
          <ProFramingSection />
          <DistrictUpsellStrip />
          <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
            <h2 className="text-3xl font-neo-display font-black text-neo-white">
              {t('education.landing.trust.title')}
            </h2>
            <ul className="mt-4 space-y-3 text-neo-white">
              <li className="flex items-start gap-3">
                <span className="text-neo-lime font-bold">✓</span>
                <span>{t('education.landing.trust.bullet1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-neo-lime font-bold">✓</span>
                <span>{t('education.landing.trust.bullet2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-neo-lime font-bold">✓</span>
                <span>{t('education.landing.trust.bullet3')}</span>
              </li>
            </ul>
          </section>

          <EducationFAQ jsonLd={false} />

          {/* Same container as the sections above it. Without one this sat at left:0 across
              the full 1440px viewport, so "Explore More" and its three links ran flush into
              the edge of the screen while every neighbour was centred. */}
          <section className="mx-auto max-w-3xl px-4 mt-8 border-t border-neo-white/20 pt-8 pb-12">
            <h2 className="text-xl font-neo-display font-bold text-neo-white mb-4">
              {t('education.landing.furtherReading.title')}
            </h2>
            <ul className="flex flex-col gap-2 text-neo-cyan">
              <li><Link href={`/${language}/guides`} className="hover:underline">{t('education.landing.furtherReading.guides')}</Link></li>
              <li><Link href={`/${language}/glossary`} className="hover:underline">{t('education.landing.furtherReading.glossary')}</Link></li>
              <li><Link href={`/${language}/tools/word-solver`} className="hover:underline">{t('education.landing.furtherReading.wordSolver')}</Link></li>
            </ul>
          </section>
        </>
      )}

    </main>
  );
}

export default PageClient;

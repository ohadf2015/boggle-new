'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { EducationHero } from '@/components/education/EducationHero';
import { MoatTrifectaSection } from '@/components/education/MoatTrifectaSection';
import { SixModeTour } from '@/components/education/SixModeTour';
import { ComparisonStrip } from '@/components/education/ComparisonStrip';
import { EducationFAQ } from '@/components/education/EducationFAQ';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
import { TeacherWelcomeBanner } from '@/components/education/TeacherWelcomeBanner';
import { speakableJsonLd } from '@/lib/seo/educationStructuredData';

/**
 * Education Landing - Master page rebuilt with scroll reveals
 * Auth-aware: teachers see shortcut dashboard; students auto-redirect; anons see full marketing
 * Sections: Hero → Moat Trifecta → 6-Mode Tour → Comparison → Trust → FAQ → CTA
 * All scroll animations respect prefers-reduced-motion
 */

// Staggered cascade for the teacher shortcut bars (pattern: playful-staggered-list)
const teacherStaggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const teacherBarVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};
const teacherBarVariantsReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

export function PageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isAuthenticated, loading, profile } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Auto-redirect authenticated students to /student dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && profile?.user_role === 'student') {
      router.replace(`/${language}/student`);
    }
  }, [loading, isAuthenticated, profile?.user_role, language, router]);

  // Determine if user has teacher/admin access
  const hasTeacherAccess = isAuthenticated && !loading && (profile?.user_role === 'teacher' || profile?.is_admin);

  // If student is redirecting, return null
  if (!loading && isAuthenticated && profile?.user_role === 'student') {
    return null;
  }

  // Organization + BreadcrumbList JSON-LD are emitted server-side in page.tsx
  // (canonical .live entity). Only the speakable WebPage hint is client-unique.
  const speakLd = speakableJsonLd([
    'h1',
    '.education-hero-sub',
    '.education-faq-q',
  ]);

  const teacherBar = shouldReduceMotion
    ? teacherBarVariantsReduced
    : teacherBarVariants;

  return (
    <main className="min-h-screen bg-neo-navy">
      <TopBackLink className="mb-4" />

      {/* Teacher view: cascading shortcut bars + relevant redesign content */}
      {hasTeacherAccess && (
        <>
          <m.div
            variants={teacherStaggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Teacher welcome banner for newly-approved teachers */}
            <m.div variants={teacherBar} className="px-4 py-4">
              <div className="mx-auto max-w-4xl">
                <TeacherWelcomeBanner hasAccess={hasTeacherAccess} />
              </div>
            </m.div>

            {/* Auth-aware shortcut */}
            <m.div
              variants={teacherBar}
              data-testid="auth-dashboard-shortcut"
              className="bg-neo-lime/10 border-b-2 border-neo-lime px-4 py-3 sm:py-4"
            >
              <div className="mx-auto max-w-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-neo-white">
                    {t('education.landing.welcomeBack')}
                  </p>
                  <p className="text-neo-white font-neo-display text-lg font-bold">
                    {profile?.display_name}
                  </p>
                </div>
                <a
                  href={`/${language}/teacher`}
                  data-testid="go-to-dashboard-link"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-neo-lime text-neo-navy font-bold rounded-neo shadow-hard hover:shadow-hard-lg transition-shadow"
                >
                  {t('education.landing.openDashboard')}
                  <span>→</span>
                </a>
              </div>
            </m.div>

            {/* Start Game shortcut */}
            <m.div
              variants={teacherBar}
              className="bg-neo-navy-light border-b border-neo-white/10 px-4 py-3"
            >
              <div className="mx-auto max-w-3xl">
                <a
                  href={`/${language}/multiplayer`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-neo-cyan text-neo-navy font-bold rounded-neo shadow-hard hover:shadow-hard-lg transition-shadow"
                >
                  {t('education.landing.startGame')}
                </a>
              </div>
            </m.div>
          </m.div>

          {/* Fill the page with teacher-relevant content (no "request access" noise) */}
          <div id="modes">
            <SixModeTour />
          </div>
          <ComparisonStrip />
          <EducationFAQ />
        </>
      )}

      {/* Marketing landing for unauthenticated and student views */}
      {!hasTeacherAccess && (
        <>
          <EducationHero />
          <MoatTrifectaSection />
          <div id="modes">
            <SixModeTour />
          </div>
          <ComparisonStrip />
        </>
      )}

      {/* Role cards for unauthenticated users only */}
      {!hasTeacherAccess && (
        <section className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Teacher card */}
            <div className="rounded-neo border-neo border-neo-pink bg-neo-navy-light p-6 shadow-hard">
              <h3 className="text-2xl font-neo-display font-black text-neo-pink">
                {t('education.landing.teacher')}
              </h3>
              <p className="mt-3 text-neo-white">
                {t('education.landing.teacherCta')}
              </p>
            </div>
            {/* Student card */}
            <div className="rounded-neo border-neo border-neo-cyan bg-neo-navy-light p-6 shadow-hard">
              <h3 className="text-2xl font-neo-display font-black text-neo-cyan">
                {t('education.landing.student')}
              </h3>
              <p className="mt-3 text-neo-white">
                {t('education.landing.studentCta')}
              </p>
            </div>
          </div>
        </section>
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

          <EducationFAQ />
          <TeacherAccessCTA />
        </>
      )}

      <Script
        id="education-speakable-ld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(speakLd)}
      </Script>
    </main>
  );
}

export default PageClient;

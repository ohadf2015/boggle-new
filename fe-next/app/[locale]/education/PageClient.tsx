'use client';
import Script from 'next/script';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHero } from '@/components/education/EducationHero';
import { MoatTrifectaSection } from '@/components/education/MoatTrifectaSection';
import { SixModeTour } from '@/components/education/SixModeTour';
import { ComparisonStrip } from '@/components/education/ComparisonStrip';
import { EducationFAQ } from '@/components/education/EducationFAQ';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
import {
  educationOrganizationJsonLd,
  breadcrumbJsonLd,
  speakableJsonLd,
} from '@/lib/seo/educationStructuredData';

/**
 * Education Landing - Master page rebuilt with scroll reveals
 * Sections: Hero → Moat Trifecta → 6-Mode Tour → Comparison → Trust → FAQ → CTA
 * All scroll animations respect prefers-reduced-motion
 */

export function PageClient() {
  const { t, language } = useLanguage();

  const orgLd = educationOrganizationJsonLd(language);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Home', url: `https://lexiclash.com/${language}` },
    { name: 'Education', url: `https://lexiclash.com/${language}/education` },
  ]);
  const speakLd = speakableJsonLd([
    'h1',
    '.education-hero-sub',
    '.education-faq-q',
  ]);

  return (
    <main className="min-h-screen bg-neo-navy">
      <EducationHero />
      <MoatTrifectaSection />
      <div id="modes">
        <SixModeTour />
      </div>
      <ComparisonStrip />

      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h2 className="text-3xl font-neo-display font-black text-neo-white">
          {t('education.landing.trust.title')}
        </h2>
        <ul className="mt-4 space-y-3 text-neo-white/70">
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

      <Script
        id="education-org-ld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(orgLd)}
      </Script>
      <Script
        id="education-breadcrumb-ld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(breadcrumbLd)}
      </Script>
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

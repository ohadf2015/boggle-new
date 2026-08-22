import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { buildEducationClassroomJsonLd, getEducationSubpageContent } from '@/lib/seo/educationSubpageJsonLd';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import PageClient from './PageClient';

export const dynamic = 'force-dynamic';

// Contextual entry point into the school/district lead funnel for teachers who are
// already running class games here (the warmest audience). Localized inline.
const FOR_SCHOOLS_FOOTER: Record<string, string> = {
  en: 'Bringing LexiClash to your whole school or district?',
  he: 'רוצים להביא את LexiClash לכל בית הספר או המחוז שלכם?',
  sv: 'Vill du ta LexiClash till hela din skola eller kommun?',
  ja: '学校や地域全体でLexiClashを使いませんか？',
  es: '¿Quieres llevar LexiClash a toda tu escuela o distrito?',
};
const FOR_SCHOOLS_CTA: Record<string, string> = {
  en: 'See LexiClash for Schools →',
  he: 'גלו את LexiClash לבתי ספר →',
  sv: 'Se LexiClash för skolor →',
  ja: '学校向けLexiClashを見る →',
  es: 'Ver LexiClash para escuelas →',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationClassroomGame', path: '/education/classroom-game', locale });
}

export default async function ClassroomGamePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { howTo, resource, breadcrumb } = buildEducationClassroomJsonLd(locale);
  const copy = getEducationSubpageContent('classroomGame', locale);

  return (
    <>
      <Script id="ld-edu-classroom-howto" type="application/ld+json">{JSON.stringify(howTo)}</Script>
      <Script id="ld-edu-classroom-resource" type="application/ld+json">{JSON.stringify(resource)}</Script>
      <Script id="ld-edu-classroom-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumb)}</Script>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
            <PageLoader size="lg" />
          </div>
        }
      >
        <PageClient />
      </Suspense>
      {/* Same shell + HowTo-mismatch fix as /education/duels: 17 visible words to a crawler
          (measured 2026-08-21) under a HowTo that described three unseen steps. This route
          matters more than its traffic suggests — it is the PRIMARY hero CTA of
          /education/for-schools ("Play a class game free"), which is the $149/year schools
          funnel, i.e. the one revenue path that needs no payment processor. Copy is
          CLASSROOM_CONTENT, already authored in all 6 locales.
          asH1 IS safe here, and is NOT on the sibling /education/duels: this page's client
          tree (ClassroomGameLobby, EducationHeader) emits no h1 at any state, so the page
          genuinely had none. duels' does — see the note there. Checked the rendered
          components, not just the PageClient files. */}
      <GamePageSeoContent
        title={copy.name}
        description={copy.description}
        features={copy.steps.map((s) => `${s.name} — ${s.text}`)}
        asH1
      />
      <section className="mx-auto max-w-3xl px-4 pb-12 text-center">
        <div className="rounded-neo border-neo-thick bg-neo-navy-light px-6 py-6 shadow-hard-lg">
          <p className="text-base text-neo-white/90">{FOR_SCHOOLS_FOOTER[locale] ?? FOR_SCHOOLS_FOOTER.en}</p>
          <Link
            href={`/${locale}/education/for-schools`}
            data-ph-capture-attribute-cta="classroom_for_schools"
            className="mt-4 inline-block rounded-neo border-neo-thick bg-neo-lime px-6 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg"
          >
            {FOR_SCHOOLS_CTA[locale] ?? FOR_SCHOOLS_CTA.en}
          </Link>
        </div>
      </section>
    </>
  );
}

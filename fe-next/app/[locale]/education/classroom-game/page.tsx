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
  const content = getEducationSubpageContent('classroomGame', locale);

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
      <GamePageSeoContent
        title={content.name}
        description={content.description}
        features={content.steps.map((s) => `${s.name}: ${s.text}`)}
      />
      <section className="mx-auto max-w-3xl px-4 pb-12 text-center">
        <div className="rounded-neo border-neo border-neo-purple/50 bg-neo-navy-light px-6 py-5 shadow-hard">
          <p className="text-sm text-neo-white/85">{FOR_SCHOOLS_FOOTER[locale] ?? FOR_SCHOOLS_FOOTER.en}</p>
          <Link href={`/${locale}/education/for-schools`}
            className="mt-3 inline-block rounded-neo border-neo border-neo-purple bg-neo-purple/20 px-5 py-2 font-bold text-neo-white shadow-hard-sm transition-all hover:bg-neo-purple/30 hover:shadow-hard">
            {FOR_SCHOOLS_CTA[locale] ?? FOR_SCHOOLS_CTA.en}
          </Link>
        </div>
      </section>
    </>
  );
}

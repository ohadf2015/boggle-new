import type { Metadata } from 'next';
import { Suspense } from 'react';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { buildEducationDuelsJsonLd, getEducationSubpageContent } from '@/lib/seo/educationSubpageJsonLd';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import PageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationDuels', path: '/education/duels', locale });
}

export default async function DuelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { howTo, resource, breadcrumb } = buildEducationDuelsJsonLd(locale);
  const content = getEducationSubpageContent('duels', locale);

  return (
    <>
      <Script id="ld-edu-duels-howto" type="application/ld+json">{JSON.stringify(howTo)}</Script>
      <Script id="ld-edu-duels-resource" type="application/ld+json">{JSON.stringify(resource)}</Script>
      <Script id="ld-edu-duels-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumb)}</Script>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan" />
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
    </>
  );
}

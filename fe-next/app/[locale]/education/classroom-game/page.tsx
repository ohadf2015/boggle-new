import type { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { buildEducationClassroomJsonLd, getEducationSubpageContent } from '@/lib/seo/educationSubpageJsonLd';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import PageClient from './PageClient';

export const dynamic = 'force-dynamic';

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
    </>
  );
}

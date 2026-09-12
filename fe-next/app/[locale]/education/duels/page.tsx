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
  const copy = getEducationSubpageContent('duels', locale);

  return (
    <>
      <Script id="ld-edu-duels-howto" type="application/ld+json">{JSON.stringify(howTo)}</Script>
      <Script id="ld-edu-duels-resource" type="application/ld+json">{JSON.stringify(resource)}</Script>
      <Script id="ld-edu-duels-breadcrumb" type="application/ld+json">{JSON.stringify(breadcrumb)}</Script>
      <Suspense
        fallback={
          <div className="flex h-[100dvh] items-center justify-center overflow-hidden bg-neo-navy">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan" />
          </div>
        }
      >
        {/* The SEO copy is HANDED TO the client shell rather than rendered beside
            it. As a sibling it grew the document to ~1550px against an 844px
            phone viewport — the round-1 disqualifying measurement — because a
            locked shell cannot clip what lives outside it. Inside, it is the tail
            of the one scrolling region: crawler keeps the words, phone keeps one
            screen. Deliberately NOT asH1, unlike /education/classroom-game:
            DuelHistory already emits an h1 for a signed-in student. */}
        <PageClient
          seoContent={
            <GamePageSeoContent
              title={copy.name}
              description={copy.description}
              features={copy.steps.map((s) => `${s.name} — ${s.text}`)}
            />
          }
        />
      </Suspense>
    </>
  );
}

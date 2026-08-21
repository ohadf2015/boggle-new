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
          <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan" />
          </div>
        }
      >
        <PageClient />
      </Suspense>
      {/* PageClient is client-only, so this route served 4 visible words to a crawler
          (measured 2026-08-21) while the HowTo JSON-LD above described three steps that
          appeared nowhere on the page. Google requires HowTo markup to reflect content the
          user can actually see, so rendering the same strings fixes both the shell and the
          markup mismatch. The copy is not new — DUELS_CONTENT already had all 6 locales and
          getEducationSubpageContent was exported for it, used until now only by its own
          test. Not collapsible: this page has no game above it to push down.
          Deliberately NOT asH1, unlike /education/classroom-game: PageClient.tsx:114 renders
          <DuelHistory>, and DuelHistory.tsx:127 emits an h1 — so a signed-in student viewing
          their history would get two. The SSR h1 count of 0 is misleading here because the
          client half is what supplies it. Same reason /leaderboard omits asH1. */}
      <GamePageSeoContent
        title={copy.name}
        description={copy.description}
        features={copy.steps.map((s) => `${s.name} — ${s.text}`)}
      />
    </>
  );
}

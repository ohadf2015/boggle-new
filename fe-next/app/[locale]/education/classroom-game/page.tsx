import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight } from 'lucide-react';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { buildEducationClassroomJsonLd, getEducationSubpageContent } from '@/lib/seo/educationSubpageJsonLd';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { loadTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';
import PageClient from './PageClient';
import { LobbySeoTail } from './LobbySeoTail';

export const dynamic = 'force-dynamic';

/** Dotted-path lookup into the loaded catalogue, same helper other server pages use. */
function readString(catalogue: unknown, path: string, fallback: string): string {
  let node: unknown = catalogue;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return fallback;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : fallback;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationClassroomGame', path: '/education/classroom-game', locale });
}

export default async function ClassroomGamePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { howTo, resource, breadcrumb } = buildEducationClassroomJsonLd(locale);
  const copy = getEducationSubpageContent('classroomGame', locale);
  const catalogue = await loadTranslation(locale as Language);
  const forSchoolsFooter = readString(
    catalogue,
    'education.classroomGame.forSchoolsFooter',
    'Bringing LexiClash to your whole school or district?'
  );
  const forSchoolsCta = readString(
    catalogue,
    'education.classroomGame.forSchoolsCta',
    'See LexiClash for Schools'
  );

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
      {/* Kept in the server HTML, taken out of the layout while the lobby is up
          — it is 740px tall and was the whole of this route's page scroll. */}
      <LobbySeoTail>
      <GamePageSeoContent
        title={copy.name}
        description={copy.description}
        features={copy.steps.map((s) => `${s.name} — ${s.text}`)}
        asH1
      />
      <section className="mx-auto max-w-3xl px-4 pb-12 text-center">
        <div className="rounded-neo border-neo-thick border-neo-cream/40 bg-neo-navy-light px-6 py-6 shadow-hard-lg">
          <p className="text-base text-neo-white/90">{forSchoolsFooter}</p>
          <Link
            href={`/${locale}/education/for-schools`}
            data-ph-capture-attribute-cta="classroom_for_schools"
            className="mt-4 inline-flex items-center gap-2 rounded-neo border-neo-thick bg-neo-lime px-6 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg"
          >
            {forSchoolsCta}
            <DirectionalIcon icon={ArrowRight} className="inline size-4" />
          </Link>
        </div>
      </section>
      </LobbySeoTail>
    </>
  );
}

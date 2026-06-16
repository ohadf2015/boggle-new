import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PracticePageClient from './PageClient';
import { isValidPracticeMode, PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { PracticeModeJsonLd } from '@/components/seo/PracticeJsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

// Client tree (LanguageContext + useSearchParams) requires per-request render;
// SEO content (metadata + JSON-LD) ships in-band on every SSR pass.
export const dynamic = 'force-dynamic';

const SITE_URL = 'https://www.lexiclash.live';

const MODE_BREADCRUMB_NAME: Record<(typeof PRACTICE_MODES)[number], string> = {
  classic: 'Classic Practice',
  wordHunt: 'Word Hunt Practice',
  wheelRush: 'Word Wheel Practice',
};

interface Props {
  params: Promise<{ locale: string; mode: string }>;
}

const SEO_KEY_BY_MODE: Record<(typeof PRACTICE_MODES)[number], string> = {
  classic: 'practiceClassic',
  wordHunt: 'practiceWordHunt',
  wheelRush: 'practiceWheelRush',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, mode } = await params;
  // AdSense thin-page sweep (2026-06-17): practice modes are interactive-only, noindexed
  // so the crawl sample stays on rich pages. noindex,follow keeps internal crawl paths
  // alive. docs/2026-06-17-adsense-thin-page-noindex-spec.md
  const noindexRobots = { index: false, follow: true } as const;
  if (!isValidPracticeMode(mode)) {
    const meta = await generatePageMetadata({ seoKey: 'practice', path: '/practice', locale });
    return { ...meta, robots: noindexRobots };
  }
  const meta = await generatePageMetadata({
    seoKey: SEO_KEY_BY_MODE[mode],
    path: `/practice/${mode}`,
    locale,
  });
  return { ...meta, robots: noindexRobots };
}

export default async function PracticeModePage({ params }: Props) {
  const { locale, mode } = await params;
  if (!isValidPracticeMode(mode)) notFound();
  return (
    <>
      <PracticeModeJsonLd mode={mode} locale={locale} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: `${SITE_URL}/${locale}` },
          { name: 'Practice', url: `${SITE_URL}/${locale}/practice` },
          { name: MODE_BREADCRUMB_NAME[mode], url: `${SITE_URL}/${locale}/practice/${mode}` },
        ]}
      />
      <PracticePageClient mode={mode} locale={locale} />
    </>
  );
}

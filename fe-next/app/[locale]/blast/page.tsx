import type { Metadata } from 'next';

// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const path = `/${locale}/blast`;
  return {
    title: 'Blast Mode - Chain Words Into Combos for High Scores',
    description: 'Play Blast Mode in LexiClash! Chain words into explosive combos, build multipliers, and chase high scores. Fast-paced word game action — free, no download.',
    alternates: {
      canonical: `${BASE_URL}${path}`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `${BASE_URL}/${l}/blast`])),
    },
  };
}

import BlastPageClient from './PageClient';

export default function BlastPage() {
  return <BlastPageClient />;
}

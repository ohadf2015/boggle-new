import type { Metadata } from 'next';

// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const path = `/${locale}/adventure`;
  return {
    alternates: {
      canonical: `${BASE_URL}${path}`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `${BASE_URL}/${l}/adventure`])),
    },
  };
}

import AdventurePageClient from './PageClient';

export default function AdventurePage() {
  return <AdventurePageClient />;
}

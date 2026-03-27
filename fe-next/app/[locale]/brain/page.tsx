import type { Metadata } from 'next';

// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const path = `/${locale}/brain`;
  return {
    title: 'Brain Training Drills - Sharpen Your Word Skills',
    description: 'Train your brain with LexiClash word drills. Practice pattern recognition, memory, speed, and vocabulary with targeted exercises. Free brain training games.',
    alternates: {
      canonical: `${BASE_URL}${path}`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `${BASE_URL}/${l}/brain`])),
    },
  };
}

import BrainTrainingPageClient from './PageClient';

export default function BrainTrainingPage() {
  return <BrainTrainingPageClient />;
}

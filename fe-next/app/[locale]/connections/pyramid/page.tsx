import type { Metadata } from 'next';
import PyramidPageClient from './PyramidPageClient';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Word Bridge Pyramid — LexiClash',
    description: 'Play the Word Bridge Pyramid challenge — solve three bridge riddles to unlock the finale.',
    alternates: { canonical: `${BASE_URL}/${locale}/connections/pyramid` },
    robots: { index: false, follow: true },
  };
}

export default async function ConnectionsPyramidPage({ params }: PageProps) {
  const { locale } = await params;
  return <PyramidPageClient locale={locale} />;
}

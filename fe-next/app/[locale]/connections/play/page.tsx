import type { Metadata } from 'next';
import PlayPageClient from './PlayPageClient';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Play Word Bridge — LexiClash',
    description: 'Play the Word Bridge connections puzzle.',
    alternates: { canonical: `${BASE_URL}/${locale}/connections` },
    robots: { index: false, follow: true },
  };
}

export default async function ConnectionsPlayPage({ params }: PageProps) {
  const { locale } = await params;
  return <PlayPageClient locale={locale} />;
}

import type { Metadata } from 'next';
import DailyPageClient from './DailyPageClient';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Word Bridge Daily Challenge — LexiClash',
    description: "Play today's Word Bridge daily challenge and climb the leaderboard.",
    alternates: { canonical: `${BASE_URL}/${locale}/connections/daily` },
    robots: { index: false, follow: true },
  };
}

export default async function ConnectionsDailyPage({ params }: PageProps) {
  const { locale } = await params;
  return <DailyPageClient locale={locale} />;
}

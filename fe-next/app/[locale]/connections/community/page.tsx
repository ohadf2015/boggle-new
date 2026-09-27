import type { Metadata } from 'next';
import CommunityPageClient from './CommunityPageClient';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Word Bridge Community Riddles — LexiClash',
    description: 'Browse, vote on, and suggest community Word Bridge riddles.',
    alternates: { canonical: `${BASE_URL}/${locale}/connections/community` },
    robots: { index: false, follow: true },
  };
}

export default async function ConnectionsCommunityPage({ params }: PageProps) {
  const { locale } = await params;
  return <CommunityPageClient locale={locale} />;
}

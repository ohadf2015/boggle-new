import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import PartyHubClient from './PartyHubClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'party', path: '/party', locale });
}

export default function PartyPage() {
  return <PartyHubClient />;
}

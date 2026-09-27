import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import PartyPageClient from './PageClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'party', path: '/party', locale, noIndex: true });
}

export default function PartyPage() {
  return <PartyPageClient />;
}

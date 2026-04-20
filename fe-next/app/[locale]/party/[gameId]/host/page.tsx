import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import PartyHostClient from './PartyHostClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'partyHost', path: '/party/host', locale, noIndex: true });
}

export default function PartyHostPage() {
  return <PartyHostClient />;
}

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import PartyPlayClient from './PartyPlayClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'partyPlay', path: '/party/play', locale, noIndex: true });
}

export default function PartyPlayPage() {
  return <PartyPlayClient />;
}

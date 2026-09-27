import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import LightningRoundPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainLightningRound', path: '/brain/drills/lightning-round', locale, noIndex: true });
}

export default async function LightningRoundPage({ searchParams }: { searchParams: Promise<{ check?: string }> }) {
  const { check } = await searchParams;
  return <LightningRoundPageClient isCheck={check === '1'} />;
}

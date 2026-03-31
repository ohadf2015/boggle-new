import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainLightningRound', path: '/brain/drills/lightning-round', locale });
}

import LightningRoundPageClient from './PageClient';

export default function LightningRoundPage() {
  return <LightningRoundPageClient />;
}

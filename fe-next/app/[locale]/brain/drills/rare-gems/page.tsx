import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainRareGems', path: '/brain/drills/rare-gems', locale });
}

import RareGemsPageClient from './PageClient';

export default function RareGemsPage() {
  return <RareGemsPageClient />;
}

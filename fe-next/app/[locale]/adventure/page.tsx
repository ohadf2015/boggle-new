import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'adventure', path: '/adventure', locale });
}

import AdventurePageClient from './PageClient';

export default function AdventurePage() {
  return <AdventurePageClient />;
}

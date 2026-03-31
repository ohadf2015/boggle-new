import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainMemoryHunt', path: '/brain/drills/memory-hunt', locale });
}

import MemoryHuntPageClient from './PageClient';

export default function MemoryHuntPage() {
  return <MemoryHuntPageClient />;
}

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import MemoryHuntPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainMemoryHunt', path: '/brain/drills/memory-hunt', locale, noIndex: true });
}

export default async function MemoryHuntPage() {
  return <MemoryHuntPageClient />;
}

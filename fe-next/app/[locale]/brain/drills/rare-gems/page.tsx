import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import RareGemsPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainRareGems', path: '/brain/drills/rare-gems', locale, noIndex: true });
}

export default async function RareGemsPage({ searchParams }: { searchParams: Promise<{ check?: string }> }) {
  const { check } = await searchParams;
  return <RareGemsPageClient isCheck={check === '1'} />;
}

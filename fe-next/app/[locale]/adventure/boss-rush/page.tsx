/**
 * Boss Rush Page
 *
 * Fight 5 bosses in sequence with escalating difficulty.
 * Requires defeating at least 1 boss in adventure mode to unlock.
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { BossRushPageClient } from './BossRushPageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'adventureBossRush', path: '/adventure/boss-rush', locale });
}

export default function BossRushPage() {
  return <BossRushPageClient />;
}

/**
 * Achievements Page
 *
 * Displays all adventure achievements with progress and tiers.
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { AchievementsPageClient } from './AchievementsPageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'adventureAchievements', path: '/adventure/achievements', locale });
}

export default function AchievementsPage() {
  return <AchievementsPageClient />;
}

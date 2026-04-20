/**
 * Skill Tree Page
 *
 * Displays the full skill tree with all paths and unlock functionality.
 * Accessible from adventure mode navigation.
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { SkillTreePageClient } from './SkillTreePageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'adventureSkills', path: '/adventure/skills', locale });
}

export default function SkillTreePage() {
  return <SkillTreePageClient />;
}

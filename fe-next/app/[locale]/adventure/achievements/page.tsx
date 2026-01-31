/**
 * Achievements Page
 *
 * Displays all adventure achievements with progress and tiers.
 */

import { Metadata } from 'next';
import { AchievementsPageClient } from './AchievementsPageClient';

export const metadata: Metadata = {
  title: 'Achievements | LexiClash Adventure',
  description: 'View your adventure mode achievements and progress',
};

export default function AchievementsPage() {
  return <AchievementsPageClient />;
}

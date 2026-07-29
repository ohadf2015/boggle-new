/**
 * AchievementGrid Component
 *
 * Displays all adventure achievements in a grid layout.
 * Shows earned status, tier, and progress for each achievement.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdventureAchievements } from '@/hooks/useAdventureAchievements';
import {
  ADVENTURE_ACHIEVEMENTS,
  getAchievementCategories,
  getAchievementsByCategory,
  type AdventureAchievementId,
  type AdventureAchievementCategory,
} from '@/utils/adventureAchievementUtils';
import { TIER_COLORS } from '@/utils/achievementTiers';
import { AchievementCard } from './AchievementCard';

// ==============================================
// TYPES
// ==============================================

interface AchievementGridProps {
  /** Callback when an achievement is selected */
  onSelectAchievement?: (id: AdventureAchievementId) => void;
  /** Additional CSS classes */
  className?: string;
}

// ==============================================
// CATEGORY COLORS
// ==============================================

const CATEGORY_COLORS: Record<AdventureAchievementCategory, string> = {
  gameplay: 'text-neo-lime',
  bosses: 'text-neo-red',
  progression: 'text-neo-cyan',
  mastery: 'text-neo-yellow',
};

const CATEGORY_NAMES: Record<AdventureAchievementCategory, string> = {
  gameplay: 'adventure.achievements.categories.gameplay',
  bosses: 'adventure.achievements.categories.bosses',
  progression: 'adventure.achievements.categories.progression',
  mastery: 'adventure.achievements.categories.mastery',
};

// ==============================================
// COMPONENT
// ==============================================

export function AchievementGrid({
  onSelectAchievement,
  className,
}: AchievementGridProps) {
  const { t } = useLanguage();
  const { achievementCounts, getTierInfo } = useAdventureAchievements();

  // Get categories
  const categories = getAchievementCategories();

  // Calculate total stats
  const totalAchievements = Object.keys(ADVENTURE_ACHIEVEMENTS).length;
  const earnedCount = Object.values(achievementCounts).filter((c) => c > 0).length;

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {/* Header with Stats */}
      <div className="text-center">
        <h2 className="text-2xl font-black text-neo-white mb-2">
          {t('adventure.achievements.title')}
        </h2>
        <p className="text-neo-white">
          {earnedCount} / {totalAchievements} {t('adventure.achievements.earned')}
        </p>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const achievements = getAchievementsByCategory(category);

        return (
          <div key={category} className="flex flex-col gap-4">
            {/* Category Header */}
            <h3
              className={cn(
                'text-lg font-black uppercase tracking-wide',
                CATEGORY_COLORS[category]
              )}
            >
              {t(CATEGORY_NAMES[category])}
            </h3>

            {/* Achievement Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {achievements.map((achievement) => {
                const tierInfo = getTierInfo(achievement.id);
                const isEarned = tierInfo.count > 0;
                const isHidden = achievement.hidden && !isEarned;

                return (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    count={tierInfo.count}
                    tier={tierInfo.tier}
                    isHidden={isHidden}
                    onClick={() => onSelectAchievement?.(achievement.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AchievementGrid;

/**
 * AchievementGrid Component
 *
 * Grid display of all achievements with tier progress, organized by category.
 * Shows achievement icons, names, tier badges, progress bars, and filters.
 */

'use client';

import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTierProgress, getTierDisplay, TIER_COLORS } from '@/utils/achievementTiers';
import type { AchievementCategory } from '@/lib/supabase/education/types';

// ==============================================
// TYPES
// ==============================================

export interface Achievement {
  count: number;
  category: AchievementCategory;
  icon: string;
  nameKey: string;
  descriptionKey: string;
  isSecret: boolean;
}

export interface AchievementGridProps {
  studentId: string;
  achievements: Record<string, Achievement>;
  className?: string;
}

type CategoryFilter = 'all' | AchievementCategory;

// ==============================================
// COMPONENT
// ==============================================

export const AchievementGrid = memo<AchievementGridProps>(
  ({ studentId, achievements, className }) => {
    const { t } = useLanguage();
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

    // Category tabs
    const categories: { key: CategoryFilter; labelKey: string }[] = [
      { key: 'all', labelKey: 'education.achievements.all' },
      { key: 'progress', labelKey: 'education.achievements.progress' },
      { key: 'skill', labelKey: 'education.achievements.skill' },
      { key: 'consistency', labelKey: 'education.achievements.consistency' },
      { key: 'exploration', labelKey: 'education.achievements.exploration' },
    ];

    // Filter achievements by category
    const filteredAchievements = Object.entries(achievements).filter(([_, achievement]) => {
      if (activeCategory === 'all') return true;
      return achievement.category === activeCategory;
    });

    return (
      <div className={cn('space-y-4', className)}>
        {/* Category Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                'px-4 py-2 rounded-neo border-neo border-neo-black',
                'font-bold text-sm transition-all duration-200',
                activeCategory === key
                  ? 'bg-neo-yellow text-neo-black shadow-hard'
                  : 'bg-neo-navy/50 text-neo-white/60 hover:bg-neo-navy/70'
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Achievement Grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          layout
        >
          {filteredAchievements.map(([key, achievement], index) => {
            const { count, icon, nameKey, category, isSecret } = achievement;
            const isUnlocked = count >= 1;
            const isEarned = count > 0;

            // Calculate tier progress
            const tierProgress = getTierProgress(count);
            const tierDisplay = getTierDisplay(tierProgress.currentTier);

            // Secret achievements show "???" until unlocked
            const displayName = isSecret && !isUnlocked ? '???' : t(nameKey);

            return (
              <motion.div
                key={key}
                className={cn(
                  'bg-neo-navy border-neo rounded-neo p-3 shadow-hard',
                  'relative overflow-hidden',
                  !isEarned && 'grayscale opacity-50'
                )}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
              >
                {/* Icon */}
                <div className="text-center mb-2">
                  <span className="text-5xl">{icon}</span>
                </div>

                {/* Name */}
                <h3 className="text-center font-bold text-sm text-neo-white mb-2 line-clamp-2">
                  {displayName}
                </h3>

                {/* Tier Badge */}
                <div className="flex justify-center mb-2">
                  {tierProgress.isMaxTier ? (
                    <div
                      className="px-3 py-1 rounded-full border-neo font-black text-xs"
                      style={{
                        backgroundColor: tierDisplay?.colors.bg || TIER_COLORS.PLATINUM.bg,
                        borderColor: tierDisplay?.colors.border || TIER_COLORS.PLATINUM.border,
                        color: tierDisplay?.colors.text || TIER_COLORS.PLATINUM.text,
                      }}
                    >
                      MAX
                    </div>
                  ) : tierProgress.currentTier ? (
                    <div
                      className="px-3 py-1 rounded-full border-neo font-black text-xs flex items-center gap-1"
                      style={{
                        backgroundColor: tierDisplay?.colors.bg,
                        borderColor: tierDisplay?.colors.border,
                        color: tierDisplay?.colors.text,
                      }}
                    >
                      <span>{tierDisplay?.icon}</span>
                      <span>{tierProgress.currentTier}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full border-neo border-neo-black bg-neo-navy/50 text-neo-white/40 font-black text-xs">
                      {t('education.achievements.locked')}
                    </div>
                  )}
                </div>

                {/* Progress Bar (if not max tier) */}
                {!tierProgress.isMaxTier && tierProgress.nextThreshold && (
                  <div className="space-y-1">
                    {/* Progress text */}
                    <p className="text-xs text-center text-neo-white/70">
                      {count}/{tierProgress.nextThreshold}
                    </p>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-neo-navy/50 rounded-full overflow-hidden border border-neo-black">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${tierProgress.progress}%`,
                          backgroundColor: tierDisplay?.colors.bg || TIER_COLORS.BRONZE.bg,
                        }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    );
  }
);

AchievementGrid.displayName = 'AchievementGrid';

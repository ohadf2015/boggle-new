/**
 * AchievementGrid Component
 *
 * Grid display of all achievements with tier progress, organized by category.
 * Shows achievement icons, names, tier badges, progress bars, and filters.
 */

'use client';

import { memo, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
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
                  ? 'bg-neo-lime text-neo-black shadow-hard'
                  : 'bg-neo-navy text-neo-white hover:bg-neo-navy-light'
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Achievement Grid */}
        <AdaptiveAnimatePresence mode="wait">
          <AdaptiveMotion.div
            key={activeCategory}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
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
                <AdaptiveMotion.div
                  key={key}
                  className={cn(
                    'bg-neo-navy border-neo rounded-neo p-3 shadow-hard',
                    'relative overflow-hidden',
                    !isEarned && 'grayscale opacity-75'
                  )}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 22,
                    delay: index * 0.03,
                  }}
                  whileHover={isEarned ? {
                    y: -3,
                    scale: 1.04,
                    transition: { type: 'spring', stiffness: 500, damping: 20 },
                  } : undefined}
                >
                  {/* Shimmer overlay for earned achievements */}
                  {isEarned && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-20 animate-[shimmer_3s_ease-in-out_infinite]"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                        backgroundSize: '200% 100%',
                      }}
                    />
                  )}

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
                      <div className="px-3 py-1 rounded-full border-neo border-neo-black bg-neo-navy-light text-neo-white font-black text-xs">
                        {t('education.achievements.locked')}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar (if not max tier) */}
                  {!tierProgress.isMaxTier && tierProgress.nextThreshold && (
                    <div className="space-y-1">
                      {/* Progress text */}
                      <p className="text-xs text-center text-neo-white">
                        {count}/{tierProgress.nextThreshold}
                      </p>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-neo-navy/50 rounded-full overflow-hidden border border-neo-black">
                        <AdaptiveMotion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${tierProgress.progress}%` }}
                          transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.3 + index * 0.03 }}
                          style={{
                            backgroundColor: tierDisplay?.colors.bg || TIER_COLORS.BRONZE.bg,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </AdaptiveMotion.div>
              );
            })}
          </AdaptiveMotion.div>
        </AdaptiveAnimatePresence>
      </div>
    );
  }
);

AchievementGrid.displayName = 'AchievementGrid';

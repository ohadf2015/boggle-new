/**
 * EducationBadgeGrid
 * Display all achievements with categories, progress, and pinning
 *
 * Features:
 * - Overall completion percentage and progress bar
 * - Featured badges section (1-3 pinned badges)
 * - Category sections (collapsible): Progress, Skill, Consistency, Exploration
 * - Pin logic: Max 3 badges
 * - Sorting: Earned first (by tier desc), then locked
 * - Secret badge hint count
 */

import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import AchievementProgressCard from './AchievementProgressCard';

// ============================================
// TYPES
// ============================================

export interface StudentAchievement {
  achievement_key: string;
  current_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  progress_value: number;
  next_threshold: number | null;
  percent_complete: number;
  is_pinned: boolean;
  is_secret: boolean;
  category: string;
  icon: string;
}

interface EducationBadgeGridProps {
  studentId: string;
  achievements: StudentAchievement[];
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const TIER_ORDER = { platinum: 4, gold: 3, silver: 2, bronze: 1, null: 0 };

function sortAchievements(a: StudentAchievement, b: StudentAchievement): number {
  // Earned first
  const aTierValue = a.current_tier ? TIER_ORDER[a.current_tier] : 0;
  const bTierValue = b.current_tier ? TIER_ORDER[b.current_tier] : 0;

  if (aTierValue > 0 && bTierValue === 0) return -1;
  if (aTierValue === 0 && bTierValue > 0) return 1;

  // Both earned: sort by tier desc
  if (aTierValue > 0 && bTierValue > 0) {
    return bTierValue - aTierValue;
  }

  // Both locked: maintain order
  return 0;
}

function groupByCategory(achievements: StudentAchievement[]): Record<string, StudentAchievement[]> {
  const groups: Record<string, StudentAchievement[]> = {
    progress: [],
    skill: [],
    consistency: [],
    exploration: [],
  };

  achievements.forEach(achievement => {
    if (groups[achievement.category]) {
      groups[achievement.category].push(achievement);
    }
  });

  // Sort each category
  Object.keys(groups).forEach(category => {
    groups[category].sort(sortAchievements);
  });

  return groups;
}

// ============================================
// COMPONENT
// ============================================

export default function EducationBadgeGrid({
  studentId,
  achievements,
  className = '',
}: EducationBadgeGridProps) {
  const { t } = useLanguage();

  // Track collapsed sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Calculate overall completion
  const earnedCount = achievements.filter(a => a.current_tier !== null).length;
  const totalCount = achievements.length;
  const completionPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  // Get pinned badges
  const pinnedBadges = achievements.filter(a => a.is_pinned);
  const pinnedCount = pinnedBadges.length;

  // Group by category
  const grouped = groupByCategory(achievements);

  // Count locked secrets
  const lockedSecretsCount = achievements.filter(
    a => a.is_secret && a.current_tier === null
  ).length;

  // Pin toggle handler
  const handleTogglePin = async (achievementKey: string) => {
    // TODO: Update database
    // For now, just log
    console.log('Toggle pin:', achievementKey);
  };

  // Toggle category collapse
  const toggleCategory = (category: string) => {
    setCollapsed(prev => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header Section */}
      <div className="space-y-4">
        <h2 className="font-neo-display text-3xl font-bold text-neo-white flex items-center gap-3">
          <span>🏆</span>
          {t('education.achievements.title')}
        </h2>

        {/* Overall Completion */}
        <div className="space-y-2">
          <p className="text-neo-white/80 font-neo-body">
            {t('education.achievements.completion', {
              percent: completionPercent,
              earned: earnedCount,
              total: totalCount,
            })}
          </p>

          {/* Overall Progress Bar */}
          <div
            className="h-4 bg-neo-navy-light border-2 border-neo-black rounded-neo overflow-hidden"
            role="progressbar"
            aria-label="Overall progress"
            aria-valuenow={completionPercent}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-neo-yellow transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Featured Badges Section */}
      {pinnedCount > 0 && (
        <div data-testid="featured-badges" className="space-y-4">
          <h3 className="font-neo-display text-xl font-bold text-neo-white flex items-center gap-2">
            <span>⭐</span>
            {t('education.achievements.featured')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedBadges.map(achievement => {
              return (
                <AchievementProgressCard
                  key={achievement.achievement_key}
                  achievement={{
                    key: achievement.achievement_key,
                    category: achievement.category,
                    icon: achievement.icon,
                    isSecret: achievement.is_secret,
                    currentTier: achievement.current_tier,
                    progressValue: achievement.progress_value,
                    nextThreshold: achievement.next_threshold,
                    isMaxTier: achievement.current_tier === 'platinum',
                    percentComplete: achievement.percent_complete,
                  }}
                  isPinned={true}
                  onTogglePin={handleTogglePin}
                  canPin={true}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {(['progress', 'skill', 'consistency', 'exploration'] as const).map(category => {
        const categoryAchievements = grouped[category];
        if (categoryAchievements.length === 0) return null;

        const categoryEarnedCount = categoryAchievements.filter(a => a.current_tier !== null).length;
        const isCollapsed = collapsed[category];

        return (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between text-left group"
            >
              <h3 className="font-neo-display text-xl font-bold text-neo-white">
                {t(`education.achievements.categories.${category}`)}
              </h3>

              <div className="flex items-center gap-4">
                <span className="text-sm text-neo-white/60">
                  {t('education.achievements.earned', {
                    count: categoryEarnedCount,
                    total: categoryAchievements.length,
                  })}
                </span>
                <span className="text-neo-white/60 text-xl transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </div>
            </button>

            {/* Category Content */}
            <div
              data-testid={`category-${category}`}
              data-category={category}
              data-expanded={!isCollapsed}
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300 ${
                isCollapsed ? 'hidden' : ''
              }`}
            >
              {categoryAchievements.map(achievement => {
                const canPin = achievement.is_pinned || pinnedCount < 3;

                return (
                  <AchievementProgressCard
                    key={achievement.achievement_key}
                    achievement={{
                      key: achievement.achievement_key,
                      category: achievement.category,
                      icon: achievement.icon,
                      isSecret: achievement.is_secret,
                      currentTier: achievement.current_tier,
                      progressValue: achievement.progress_value,
                      nextThreshold: achievement.next_threshold,
                      isMaxTier: achievement.current_tier === 'platinum',
                      percentComplete: achievement.percent_complete,
                    }}
                    isPinned={achievement.is_pinned}
                    onTogglePin={handleTogglePin}
                    canPin={canPin}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer: Secret Badges Hint */}
      {lockedSecretsCount > 0 && (
        <div className="text-center">
          <p className="text-neo-white/60 italic font-neo-body">
            {t('education.achievements.secretRemaining', { count: lockedSecretsCount })}
          </p>
        </div>
      )}
    </div>
  );
}

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

import React, { useState, useMemo, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, Trophy, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAchievementPin, mergePinStatus } from '../../hooks/useAchievementPin';
import { StudentAchievement } from '../../types/education';
import AchievementProgressCard from './AchievementProgressCard';
import { cn } from '@/lib/utils';



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
  const aTierValue = a.currentTier ? TIER_ORDER[a.currentTier] : 0;
  const bTierValue = b.currentTier ? TIER_ORDER[b.currentTier] : 0;

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

  // Achievement pin hook
  const {
    pinnedKeys,
    togglePin,
    isLoading: isPinLoading,
    error: pinError,
    clearError,
    maxPins,
    pinCount,
    canPinMore,
  } = useAchievementPin(studentId);

  // Merge achievements with pin status from hook
  const achievementsWithPins = useMemo(
    () => mergePinStatus(achievements, pinnedKeys),
    [achievements, pinnedKeys]
  );

  // Derived stats from achievementsWithPins
  const { earnedCount, totalCount, completionPercent, pinnedBadges, lockedSecretsCount, grouped } = useMemo(() => {
    const earned = achievementsWithPins.filter(a => a.currentTier !== null).length;
    const total = achievementsWithPins.length;
    return {
      earnedCount: earned,
      totalCount: total,
      completionPercent: total > 0 ? Math.round((earned / total) * 100) : 0,
      pinnedBadges: achievementsWithPins.filter(a => a.isPinned),
      lockedSecretsCount: achievementsWithPins.filter(a => a.isSecret && a.currentTier === null).length,
      grouped: groupByCategory(achievementsWithPins),
    };
  }, [achievementsWithPins]);

  const pinnedCount = pinCount;

  // Pin toggle handler
  const handleTogglePin = useCallback(async (achievementKey: string, currentPinned: boolean) => {
    await togglePin(achievementKey, currentPinned);
  }, [togglePin]);

  // Toggle category collapse
  const toggleCategory = useCallback((category: string) => {
    setCollapsed(prev => ({ ...prev, [category]: !prev[category] }));
  }, []);

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header Section */}
      <div className="space-y-4">
        <h2 className="font-neo-display text-3xl font-bold text-neo-white flex items-center gap-3">
          <Trophy className="w-5 h-5" />
          {t('education.achievements.title')}
        </h2>

        {/* Overall Completion */}
        <div className="space-y-2">
          <p className="text-neo-white font-neo-body">
            {t('education.achievements.completion', {
              percent: completionPercent,
              earned: earnedCount,
              total: totalCount,
            })}
          </p>

          {/* Overall Progress Bar */}
          <div
            className="h-4 bg-neo-navy-light border-neo border-neo-black rounded-neo overflow-hidden"
            role="progressbar"
            aria-label={t('education.achievements.ariaOverallProgress')}
            aria-valuenow={completionPercent}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-neo-lime transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Featured Badges Section */}
      {pinnedCount > 0 && (
        <div data-testid="featured-badges" className="space-y-4">
          <h3 className="font-neo-display text-xl font-bold text-neo-white flex items-center gap-2">
            <Star className="w-5 h-5" />
            {t('education.achievements.featured')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedBadges.map((achievement, i) => {
              return (
                <m.div
                  key={`featured-${achievement.achievementKey}`}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, type: 'spring', stiffness: 350, damping: 22 }}
                >
                  <AchievementProgressCard
                    achievement={{
                      key: achievement.achievementKey,
                      category: achievement.category,
                      icon: achievement.icon,
                      isSecret: achievement.isSecret,
                      currentTier: achievement.currentTier,
                      progressValue: achievement.progressValue,
                      nextThreshold: achievement.nextThreshold,
                      isMaxTier: achievement.currentTier === 'platinum',
                      percentComplete: achievement.percentComplete,
                    }}
                    isPinned={true}
                    onTogglePin={handleTogglePin}
                    canPin={true}
                    isLoading={isPinLoading}
                  />
                </m.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {(['progress', 'skill', 'consistency', 'exploration'] as const).map(category => {
        const categoryAchievements = grouped[category];
        if (categoryAchievements.length === 0) return null;

        const categoryEarnedCount = categoryAchievements.filter(a => a.currentTier !== null).length;
        const isCollapsed = collapsed[category];

        return (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              aria-expanded={!isCollapsed}
              aria-controls={`category-${category}`}
              className="w-full flex items-center justify-between text-start group p-3 -m-3 rounded-neo hover:bg-neo-white/5 transition-colors"
            >
              <h3 className="font-neo-display text-xl font-bold text-neo-white group-hover:text-neo-cyan transition-colors">
                {t(`education.achievements.categories.${category}`)}
              </h3>

              <div className="flex items-center gap-4">
                <span className="text-sm text-neo-white group-hover:text-neo-white transition-colors">
                  {t('education.achievements.earned', {
                    count: categoryEarnedCount,
                    total: categoryAchievements.length,
                  })}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-neo-white group-hover:text-neo-cyan transition-all duration-200 ${
                    isCollapsed ? '-rotate-90' : 'rotate-0'
                  }`}
                />
              </div>
            </button>

            {/* Category Content */}
            <div
              id={`category-${category}`}
              data-testid={`category-${category}`}
              data-category={category}
              data-expanded={!isCollapsed}
              role="region"
              className={cn(
                'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300 origin-top',
                isCollapsed
                  ? 'grid-rows-[0fr] opacity-0 scale-y-0 h-0 overflow-hidden'
                  : 'grid-rows-[1fr] opacity-100 scale-y-100'
              )}
            >
              {categoryAchievements.map((achievement, achIdx) => {
                const canPinAchievement = achievement.isPinned || canPinMore;

                return (
                  <m.div
                    key={achievement.achievementKey}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.03 * Math.min(achIdx, 12), type: 'spring', stiffness: 400, damping: 24 }}
                  >
                    <AchievementProgressCard
                      achievement={{
                        key: achievement.achievementKey,
                        category: achievement.category,
                        icon: achievement.icon,
                        isSecret: achievement.isSecret,
                        currentTier: achievement.currentTier,
                        progressValue: achievement.progressValue,
                        nextThreshold: achievement.nextThreshold,
                        isMaxTier: achievement.currentTier === 'platinum',
                        percentComplete: achievement.percentComplete,
                      }}
                      isPinned={achievement.isPinned}
                      onTogglePin={handleTogglePin}
                      canPin={canPinAchievement}
                      isLoading={isPinLoading}
                    />
                  </m.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Pin Error Toast */}
      {pinError && (
        <div className="fixed bottom-[calc(1rem+var(--admob-banner-height,0px))] end-4 z-50">
          <div className="bg-neo-pink text-neo-black px-4 py-3 rounded-neo border-3 border-neo-black shadow-hard-lg flex items-center gap-3">
            <span className="font-neo-body">{pinError}</span>
            <button
              type="button"
              onClick={clearError}
              className="font-bold hover:underline"
              aria-label={t('education.achievements.ariaDismissError')}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Pin Limit Indicator */}
      <div className="text-center">
        <p className={cn(
          'text-sm font-neo-body',
          canPinMore ? 'text-neo-white' : 'text-neo-lime'
        )}>
          {t('education.achievements.pinLimit', {
            current: pinCount,
            max: maxPins,
          })}
        </p>
      </div>

      {/* Footer: Secret Badges Hint */}
      {lockedSecretsCount > 0 && (
        <div className="text-center">
          <p className="text-neo-white italic font-neo-body">
            {t('education.achievements.secretRemaining', { count: lockedSecretsCount })}
          </p>
        </div>
      )}
    </div>
  );
}

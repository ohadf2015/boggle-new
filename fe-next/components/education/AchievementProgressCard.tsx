/**
 * AchievementProgressCard
 * Displays individual achievement card with tier, progress, and pin functionality
 *
 * Features:
 * - Earned badges: Show tier, icon, progress bar to next tier
 * - Locked badges: Grayed out with hint text
 * - Secret badges: Show "???" until unlocked
 * - Pin functionality: Max 3 badges can be pinned
 * - Neo-Brutalist styling: Hard shadows, chunky borders
 */

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

// ============================================
// TYPES
// ============================================

export interface AchievementProgressCardProps {
  achievement: {
    key: string;
    category: string;
    icon: string;
    isSecret: boolean;
    currentTier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
    progressValue: number;
    nextThreshold: number | null;
    currentThreshold?: number; // Current tier's threshold (for percent calculation)
    isMaxTier: boolean;
  };
  isPinned: boolean;
  onTogglePin: (key: string) => void;
  canPin: boolean; // false if 3 already pinned and not this one
}

// ============================================
// TIER COLORS
// ============================================

const TIER_COLORS = {
  bronze: {
    bg: 'bg-amber-700',
    border: 'border-amber-800',
    fill: 'bg-amber-600',
  },
  silver: {
    bg: 'bg-gray-400',
    border: 'border-gray-500',
    fill: 'bg-gray-300',
  },
  gold: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-600',
    fill: 'bg-yellow-400',
  },
  platinum: {
    bg: 'bg-cyan-400',
    border: 'border-cyan-500',
    fill: 'bg-cyan-300',
  },
};

// ============================================
// COMPONENT
// ============================================

export default function AchievementProgressCard({
  achievement,
  isPinned,
  onTogglePin,
  canPin,
}: AchievementProgressCardProps) {
  const { t } = useLanguage();

  const isLocked = achievement.currentTier === null;
  const isEarned = !isLocked;

  // Get tier-specific colors
  const tierColors = achievement.currentTier ? TIER_COLORS[achievement.currentTier] : null;

  // Calculate percent to next tier (for earned badges)
  const calculatePercentToNext = (): number => {
    if (!isEarned || achievement.isMaxTier || !achievement.nextThreshold) return 0;

    // Use provided currentThreshold or default to 0 (for bronze)
    const currentBase = achievement.currentThreshold || 0;
    const range = achievement.nextThreshold - currentBase;
    const progressInRange = achievement.progressValue - currentBase;

    return Math.min(100, Math.round((progressInRange / range) * 100));
  };

  // Get next tier name for display
  const getNextTierName = (): string => {
    if (!achievement.currentTier) return t('education.achievements.tiers.bronze');
    if (achievement.currentTier === 'bronze') return t('education.achievements.tiers.silver');
    if (achievement.currentTier === 'silver') return t('education.achievements.tiers.gold');
    if (achievement.currentTier === 'gold') return t('education.achievements.tiers.platinum');
    return '';
  };

  const percentToNext = calculatePercentToNext();

  return (
    <article
      className={`
        relative rounded-neo border-neo border-neo-black
        ${isEarned ? 'bg-neo-navy/50 shadow-hard' : 'bg-neo-navy/20 opacity-50'}
        p-4 transition-all
      `}
      aria-label={`${t(`education.achievements.${achievement.key}.name`)} achievement`}
      data-locked={isLocked ? 'true' : 'false'}
      data-tier={achievement.currentTier || undefined}
    >
      {/* Icon Circle */}
      <div className="flex items-start gap-4">
        <div
          className={`
            flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center
            border-neo-thick border-neo-black
            ${tierColors?.bg || 'bg-neo-navy-light'}
            ${tierColors?.border || 'border-neo-black'}
            ${isLocked ? 'opacity-40' : ''}
          `}
        >
          <span className="text-3xl">
            {achievement.isSecret && isLocked ? '???' : achievement.icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + Tier */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-neo-display font-bold text-neo-white text-lg truncate">
                {achievement.isSecret && isLocked
                  ? t('education.achievements.secret')
                  : t(`education.achievements.${achievement.key}.name`)}
              </h3>
              {isEarned && achievement.currentTier && (
                <p className={`text-sm font-neo-body ${tierColors?.fill || ''}`}>
                  {t(`education.achievements.tiers.${achievement.currentTier}`)}
                </p>
              )}
              {isLocked && (
                <p className="text-sm text-neo-white/60">
                  {t('education.achievements.locked')}
                </p>
              )}
            </div>

            {/* Pin Button (only for earned badges) */}
            {isEarned && (
              <button
                onClick={() => onTogglePin(achievement.key)}
                disabled={!isPinned && !canPin}
                aria-label={isPinned ? t('education.achievements.unpin') : t('education.achievements.pin')}
                title={!isPinned && !canPin ? t('education.achievements.maxPinsReached') : ''}
                className={`
                  w-8 h-8 rounded flex items-center justify-center
                  border-2 border-neo-black transition-all
                  ${isPinned ? 'bg-neo-yellow shadow-hard-sm' : 'bg-neo-white/30'}
                  ${!isPinned && !canPin ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}
                `}
              >
                <span className="text-lg">{isPinned ? '⭐' : '☆'}</span>
              </button>
            )}
          </div>

          {/* Progress Section */}
          {isEarned && !achievement.isMaxTier && achievement.nextThreshold && (
            <div className="mt-3">
              {/* Progress Bar */}
              <div
                className="h-3 bg-neo-navy-light border-2 border-neo-black rounded-sm overflow-hidden"
                role="progressbar"
                aria-valuenow={achievement.progressValue}
                aria-valuemax={achievement.nextThreshold}
              >
                <div
                  className={`h-full ${tierColors?.fill || 'bg-neo-cyan'} transition-all duration-300`}
                  style={{ width: `${percentToNext}%` }}
                />
              </div>

              {/* Progress Text */}
              <div className="flex items-center justify-between mt-2 text-xs text-neo-white/80">
                <span>{t('education.achievements.progress', {
                  current: achievement.progressValue,
                  next: achievement.nextThreshold,
                })}</span>
                <span>{t('education.achievements.toNext', {
                  percent: percentToNext,
                  tier: getNextTierName(),
                })}</span>
              </div>
            </div>
          )}

          {/* Max Tier Badge */}
          {isEarned && achievement.isMaxTier && (
            <div className="mt-3">
              <span className="inline-block px-3 py-1 bg-neo-yellow text-neo-black font-neo-display font-bold text-sm border-2 border-neo-black rounded-neo shadow-hard-sm">
                {t('education.achievements.maxTier')}
              </span>
            </div>
          )}

          {/* Hint for Locked Badges */}
          {isLocked && (
            <div className="mt-3">
              <p className="text-sm text-neo-white/60 italic">
                {achievement.isSecret
                  ? t(`education.achievements.${achievement.key}.hint`)
                  : t(`education.achievements.${achievement.key}.hint`)}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

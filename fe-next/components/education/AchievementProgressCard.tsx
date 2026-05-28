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
import { Star } from 'lucide-react';
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
    isMaxTier: boolean;
    percentComplete: number; // Already calculated percent progress (0-100)
  };
  isPinned: boolean;
  onTogglePin: (key: string, currentPinned: boolean) => void;
  canPin: boolean; // false if 3 already pinned and not this one
  isLoading?: boolean;
}

// ============================================
// TIER COLORS
// ============================================

// B3 contrast: tier "text" tone is shown over neo-navy and must stay
// >= 4.5:1. Silver in particular previously used `bg-neo-white/60` as a
// text color, which renders ~2.5:1 on navy.
const TIER_COLORS = {
  bronze: {
    bg: 'bg-amber-700',
    border: 'border-amber-800',
    fill: 'bg-amber-500',
    text: 'text-amber-300',
  },
  silver: {
    bg: 'bg-slate-300',
    border: 'border-slate-400',
    fill: 'bg-slate-300',
    text: 'text-slate-200',
  },
  gold: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-600',
    fill: 'bg-yellow-400',
    text: 'text-yellow-300',
  },
  platinum: {
    bg: 'bg-cyan-400',
    border: 'border-cyan-500',
    fill: 'bg-cyan-300',
    text: 'text-cyan-200',
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
  isLoading = false,
}: AchievementProgressCardProps) {
  const { t } = useLanguage();

  const isLocked = achievement.currentTier === null;
  const isEarned = !isLocked;

  // Get tier-specific colors
  const tierColors = achievement.currentTier ? TIER_COLORS[achievement.currentTier] : null;

  // Get percent to next tier (already calculated from backend)
  const calculatePercentToNext = (): number => {
    if (!isEarned || achievement.isMaxTier || !achievement.nextThreshold) return 0;
    return Math.min(100, Math.round(achievement.percentComplete));
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
        ${isEarned ? 'bg-neo-navy/50 shadow-hard' : 'bg-neo-navy-light/70 opacity-80'}
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
            shrink-0 w-16 h-16 rounded-full flex items-center justify-center
            border-neo-thick border-neo-black
            ${tierColors?.bg || 'bg-neo-navy-light'}
            ${tierColors?.border || 'border-neo-black'}
            ${isLocked ? 'opacity-40' : ''}
          `}
        >
          <span
            data-testid="achievement-icon"
            role="img"
            aria-label={
              achievement.isSecret && isLocked
                ? t('education.achievements.secret')
                : `${t(`education.achievements.${achievement.key}.name`)} icon`
            }
            className="text-3xl"
          >
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
                <p className={`text-sm font-neo-body font-bold ${tierColors?.text || 'text-neo-white'}`}>
                  {t(`education.achievements.tiers.${achievement.currentTier}`)}
                </p>
              )}
              {isLocked && (
                <p className="text-sm text-neo-white">
                  {t('education.achievements.locked')}
                </p>
              )}
            </div>

            {/* Pin Button (only for earned badges) */}
            {isEarned && (
              <button
                onClick={() => onTogglePin(achievement.key, isPinned)}
                disabled={!isPinned && !canPin}
                aria-label={isPinned ? t('education.achievements.unpin') : t('education.achievements.pin')}
                title={!isPinned && !canPin ? t('education.achievements.maxPinsReached') : ''}
                className={`
                  w-8 h-8 rounded flex items-center justify-center
                  border-neo border-neo-black transition-all
                  ${isPinned ? 'bg-neo-lime text-neo-black shadow-hard-sm' : 'bg-neo-navy-light text-neo-white'}
                  ${!isPinned && !canPin ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}
                `}
              >
                {isPinned ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Progress Section */}
          {isEarned && !achievement.isMaxTier && achievement.nextThreshold && (
            <div className="mt-3">
              {/* Progress Bar */}
              <div
                className="h-3 bg-neo-navy-light border-neo border-neo-black rounded-sm overflow-hidden"
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
              <div className="flex items-center justify-between mt-2 text-xs text-neo-white">
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
              <span className="inline-block px-3 py-1 bg-neo-lime text-neo-black font-neo-display font-bold text-sm border-neo border-neo-black rounded-neo shadow-hard-sm">
                {t('education.achievements.maxTier')}
              </span>
            </div>
          )}

          {/* Hint for Locked Badges */}
          {isLocked && (
            <div className="mt-3">
              <p className="text-sm text-neo-white italic">
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

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

/**
 * XP calculation helpers (mirror of backend xpManager.js)
 */
const XP_CONFIG = {
  LEVEL_EXPONENT: 1.5,
  LEVEL_BASE: 100,
  MAX_LEVEL: 100,
};

/**
 * XP Progress information
 */
interface XpProgress {
  currentLevel: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  isMaxLevel: boolean;
}

function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(XP_CONFIG.LEVEL_BASE * Math.pow(level, XP_CONFIG.LEVEL_EXPONENT));
}

function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  let low = 1;
  let high = XP_CONFIG.MAX_LEVEL;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (getXpForLevel(mid) <= totalXp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return Math.min(low, XP_CONFIG.MAX_LEVEL);
}

function getXpProgress(totalXp: number): XpProgress {
  const currentLevel = getLevelFromXp(totalXp);
  const isMaxLevel = currentLevel >= XP_CONFIG.MAX_LEVEL;
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = isMaxLevel ? currentLevelXp : getXpForLevel(currentLevel + 1);
  const xpInCurrentLevel = totalXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  const progressPercent = isMaxLevel ? 100 : Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100);

  return {
    currentLevel,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
    isMaxLevel,
  };
}

/**
 * XpProgressBar Props
 */
interface XpProgressBarProps {
  totalXp?: number;
  compact?: boolean;
  showNumbers?: boolean;
  className?: string;
}

/**
 * Neo-Brutalist XP Progress Bar Component
 * Shows level progress with animated fill bar
 */
const XpProgressBar = memo<XpProgressBarProps>(({
  totalXp = 0,
  compact = false,
  showNumbers = true,
  className,
}) => {
  const { t } = useLanguage();
  const progress = useMemo(() => getXpProgress(totalXp), [totalXp]);

  return (
    <div className={cn('w-full', className)}>
      {/* Level indicator and XP numbers */}
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-black text-neo-black dark:text-neo-cream uppercase">
            {t('xp.level') || 'Level'} {progress.currentLevel}
          </span>
          {showNumbers && !progress.isMaxLevel && (
            <span className="text-xs font-bold text-neo-black/60 dark:text-neo-cream/60">
              {progress.xpInCurrentLevel.toLocaleString()} / {progress.xpNeededForNextLevel.toLocaleString()} XP
            </span>
          )}
          {progress.isMaxLevel && (
            <span className="text-xs font-bold text-neo-purple">
              {t('xp.maxLevel') || 'Max Level'}
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        className={cn(
          'relative w-full rounded-neo overflow-hidden',
          'bg-neo-black/10 dark:bg-neo-white/10',
          'border-2 border-neo-black',
          compact ? 'h-2' : 'h-3'
        )}
      >
        {/* Animated fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress.progressPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'absolute inset-y-0 left-0',
            'bg-gradient-to-r from-neo-cyan via-neo-purple to-neo-pink',
            'shadow-sm'
          )}
        />

        {/* Shimmer effect */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
          className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      </div>

      {/* Compact mode shows level inline */}
      {compact && (
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] font-bold text-neo-black/60 dark:text-neo-cream/60">
            Lv {progress.currentLevel}
          </span>
          <span className="text-[10px] font-bold text-neo-black/60 dark:text-neo-cream/60">
            {progress.progressPercent}%
          </span>
        </div>
      )}
    </div>
  );
});

XpProgressBar.displayName = 'XpProgressBar';

export default XpProgressBar;
export { getXpProgress, getLevelFromXp, getXpForLevel };

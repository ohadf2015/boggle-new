import { memo, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';
import PrestigeModal from './engagement/PrestigeModal';

import {
  getXpProgress,
  getLevelFromXp,
  getXpForLevel,
  type PrestigeReward,
} from '@/backend/modules/xpManager';

/**
 * Prestige display configuration
 */
const PRESTIGE_DISPLAY = {
  1: { name: 'Prestige I', color: '#CD7F32', icon: '⭐', gradient: 'from-amber-700 to-amber-500' },
  2: { name: 'Prestige II', color: '#C0C0C0', icon: '🌟', gradient: 'from-gray-500 to-gray-300' },
  3: { name: 'Prestige III', color: '#FFD700', icon: '✨', gradient: 'from-yellow-600 to-yellow-400' },
  4: { name: 'Prestige IV', color: '#B9F2FF', icon: '💫', gradient: 'from-cyan-500 to-cyan-300' },
  5: { name: 'Prestige V', color: '#9B59B6', icon: '🌌', gradient: 'from-purple-700 to-pink-500' },
} as const;

/**
 * XpProgressBar Props
 */
interface XpProgressBarProps {
  totalXp?: number;
  compact?: boolean;
  showNumbers?: boolean;
  className?: string;
  // Prestige props
  prestigeLevel?: number;
  prestigeMultiplier?: number;
  showPrestige?: boolean;
  nextPrestigeRewards?: PrestigeReward[];
  onPrestigeSuccess?: () => void;
}

/**
 * Neo-Brutalist XP Progress Bar Component
 * Shows level progress with animated fill bar and prestige indicator
 */
const XpProgressBar = memo<XpProgressBarProps>(({
  totalXp = 0,
  compact = false,
  showNumbers = true,
  className,
  prestigeLevel = 0,
  prestigeMultiplier = 1.0,
  showPrestige = true,
  nextPrestigeRewards = [],
  onPrestigeSuccess,
}) => {
  const { t, language } = useLanguage();
  const progress = useMemo(() => getXpProgress(totalXp), [totalXp]);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);

  const openPrestigeModal = useCallback(() => {
    setShowPrestigeModal(true);
  }, []);

  const prestigeDisplay = prestigeLevel > 0 && prestigeLevel <= 5
    ? PRESTIGE_DISPLAY[prestigeLevel as keyof typeof PRESTIGE_DISPLAY]
    : null;

  const canPrestige = progress.isMaxLevel && prestigeLevel < 5;

  return (
    <div className={cn('w-full', className)}>
      {/* Level indicator and XP numbers */}
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-neo-black dark:text-gray-100 uppercase">
              {t('xp.level')} {progress.currentLevel}
            </span>
            {/* Prestige Badge */}
            {showPrestige && prestigeDisplay && (
              <button
                onClick={openPrestigeModal}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold',
                  'border border-current/30',
                  'hover:scale-105 transition-transform cursor-pointer',
                  `bg-gradient-to-r ${prestigeDisplay.gradient} text-white`
                )}
                title={`${prestigeDisplay.name} - Click for details`}
              >
                <span>{prestigeDisplay.icon}</span>
                <span className="hidden sm:inline">{prestigeLevel}</span>
              </button>
            )}
            {/* XP Multiplier indicator */}
            {showPrestige && prestigeMultiplier > 1 && (
              <span className="text-[10px] font-bold text-neo-lime bg-neo-lime/20 px-1.5 py-0.5 rounded">
                +{Math.round((prestigeMultiplier - 1) * 100)}% XP
              </span>
            )}
          </div>
          {showNumbers && !progress.isMaxLevel && (
            <span className="text-xs font-bold text-neo-black/75 dark:text-gray-300">
              {progress.xpInCurrentLevel.toLocaleString()} / {progress.xpNeededForNextLevel.toLocaleString()} XP
            </span>
          )}
          {progress.isMaxLevel && (
            <button
              onClick={showPrestige ? openPrestigeModal : undefined}
              className={cn(
                'text-xs font-bold flex items-center gap-1',
                canPrestige
                  ? 'text-neo-lime animate-pulse cursor-pointer hover:underline'
                  : 'text-neo-pink'
              )}
            >
              {canPrestige && <Sparkles className="w-3 h-3" />}
              {canPrestige
                ? (t('xp.canPrestige'))
                : (t('xp.maxLevel'))}
            </button>
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
            'bg-gradient-to-r from-neo-cyan via-neo-pink to-neo-pink',
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
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-neo-black/75 dark:text-gray-300">
              Lv {progress.currentLevel}
            </span>
            {showPrestige && prestigeDisplay && (
              <span className="text-[10px]">{prestigeDisplay.icon}</span>
            )}
          </div>
          <span className="text-[10px] font-bold text-neo-black/75 dark:text-gray-300">
            {progress.progressPercent}%
          </span>
        </div>
      )}

      {/* Prestige Modal */}
      {showPrestige && (
        <PrestigeModal
          isOpen={showPrestigeModal}
          onClose={() => setShowPrestigeModal(false)}
          currentLevel={progress.currentLevel}
          currentPrestige={prestigeLevel}
          prestigeMultiplier={prestigeMultiplier}
          nextRewards={nextPrestigeRewards}
          canPrestige={canPrestige}
          maxPrestige={5}
          t={t}
          language={language}
          onPrestigeSuccess={onPrestigeSuccess}
        />
      )}
    </div>
  );
});

XpProgressBar.displayName = 'XpProgressBar';

export default XpProgressBar;
export { getLevelFromXp, getXpForLevel };

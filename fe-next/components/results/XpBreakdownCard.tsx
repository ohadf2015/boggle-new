import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { getXpProgress } from '@/shared/utils/adventureXpUtils';

interface XpBreakdown {
  gameCompletion: number;
  scoreXp: number;
  winBonus: number;
  achievementXp: number;
}

interface XpGainedData {
  xpEarned: number;
  xpBreakdown: XpBreakdown;
  newTotalXp: number;
  newLevel: number;
}

interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
}

interface XpBreakdownCardProps {
  xpGainedData: XpGainedData;
  levelUpData?: LevelUpData | null;
  isWinner?: boolean;
}

const XpBreakdownCard = memo<XpBreakdownCardProps>(({ xpGainedData, levelUpData, isWinner }) => {
  const { t, dir } = useLanguage();
  const { xpBreakdown, xpEarned, newTotalXp, newLevel } = xpGainedData;

  // Calculate XP progress for the animated bar
  const xpProgress = useMemo(() => getXpProgress(newTotalXp), [newTotalXp]);
  const previousProgress = useMemo(() => {
    const prevXp = Math.max(0, newTotalXp - xpEarned);
    return getXpProgress(prevXp);
  }, [newTotalXp, xpEarned]);
  // Arrow for level up indicator - use ← in RTL and → in LTR to show progression
  // In RTL languages, left arrow indicates "going up/forward"
  const levelArrow = dir === 'rtl' ? '←' : '→';

  const breakdownItems = [
    { key: 'gameCompletion', label: t('xp.baseXp'), value: xpBreakdown.gameCompletion, icon: '🎮' },
    { key: 'scoreXp', label: t('xp.scoreBonus'), value: xpBreakdown.scoreXp, icon: '📊' },
    { key: 'winBonus', label: t('xp.winBonus'), value: xpBreakdown.winBonus, icon: '🏆', highlight: isWinner },
    { key: 'achievementXp', label: t('xp.achievementBonus'), value: xpBreakdown.achievementXp, icon: '🏅' },
  ].filter(item => item.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      className={cn(
        "mt-4 p-4 rounded-neo border-3 border-neo-black shadow-hard relative overflow-hidden",
        levelUpData ? "bg-gradient-to-br from-neo-lime via-neo-lime to-neo-pink" : "bg-neo-cream dark:bg-slate-700"
      )}
    >
      {/* Comic-style halftone dots */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)`,
          backgroundSize: '12px 12px',
        }}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            className="text-xl"
          >
            ⭐
          </motion.span>
          <h4 className="font-black text-neo-black dark:text-neo-cream uppercase text-sm">
            {t('xp.xpGained')}
          </h4>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 26 }}
          className="bg-neo-black text-neo-cream px-3 py-1 rounded-neo font-black text-lg"
        >
          +{xpEarned}
        </motion.div>
      </div>

      {/* Breakdown items */}
      <div className="space-y-2 mb-3 relative z-10">
        {breakdownItems.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1, type: 'spring', stiffness: 300, damping: 26 }}
            className={cn(
              "flex items-center justify-between px-2 py-1 rounded-neo border-2 border-neo-black/30 dark:border-neo-cream/30",
              item.highlight ? "bg-neo-lime" : "bg-neo-cream/50 dark:bg-slate-600/50"
            )}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-neo-black dark:text-neo-cream">
              <span>{item.icon}</span>
              {item.label}
            </span>
            <span className="font-black text-neo-black dark:text-neo-cream">+{item.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Level info + XP progress bar */}
      <div className="pt-2 border-t-2 border-neo-black/20 relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neo-black/70 uppercase">
            {t('xp.level')} {newLevel}
          </span>
          <span className="text-xs font-bold text-neo-black/70">
            {xpProgress.isMaxLevel
              ? t('xp.maxLevel')
              : `${xpProgress.xpInCurrentLevel} / ${xpProgress.xpNeededForNextLevel}`
            }
          </span>
        </div>

        {/* Animated XP bar — fills from previous level progress to current */}
        {!xpProgress.isMaxLevel && (
          <div className="h-3 bg-neo-black/20 rounded-full overflow-hidden border border-neo-black/30">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-neo-purple via-neo-pink to-neo-purple"
              initial={{ width: `${previousProgress.progressPercent}%` }}
              animate={{ width: `${xpProgress.progressPercent}%` }}
              transition={{ delay: 1.0, duration: 1.2, ease: 'easeOut' }}
              style={{ boxShadow: '0 0 8px var(--neo-purple, #8B5CF6)' }}
            />
          </div>
        )}

        <div className="flex justify-end">
          <span className="text-[10px] font-bold text-neo-black/50">
            {t('xp.totalXpEarned')}: {newTotalXp.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Level Up celebration */}
      {levelUpData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 26 }}
          className="mt-3 p-3 bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard-sm text-center relative z-10"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-2xl mb-1"
          >
            🎉
          </motion.div>
          <p className="font-black text-neo-black uppercase text-sm">
            {t('xp.levelUp')}
          </p>
          <p className="font-bold text-neo-black text-lg">
            {levelUpData.oldLevel} {levelArrow} {levelUpData.newLevel}
          </p>
          {levelUpData.newTitles && levelUpData.newTitles.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, type: 'spring', stiffness: 280, damping: 26 }}
              className="text-xs font-bold text-neo-pink mt-1"
            >
              {t('xp.titleUnlocked')}: {levelUpData.newTitles[0]}
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
});

XpBreakdownCard.displayName = 'XpBreakdownCard';

export default XpBreakdownCard;

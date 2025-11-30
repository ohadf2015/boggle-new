import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

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
  const { t } = useLanguage();
  const { xpBreakdown, xpEarned, newTotalXp, newLevel } = xpGainedData;

  const breakdownItems = [
    { key: 'gameCompletion', label: t('xp.baseXp') || 'Base XP', value: xpBreakdown.gameCompletion, icon: '🎮' },
    { key: 'scoreXp', label: t('xp.scoreBonus') || 'Score Bonus', value: xpBreakdown.scoreXp, icon: '📊' },
    { key: 'winBonus', label: t('xp.winBonus') || 'Win Bonus', value: xpBreakdown.winBonus, icon: '🏆', highlight: isWinner },
    { key: 'achievementXp', label: t('xp.achievementBonus') || 'Achievement Bonus', value: xpBreakdown.achievementXp, icon: '🏅' },
  ].filter(item => item.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      className={cn(
        "mt-4 p-4 rounded-neo border-3 border-neo-black shadow-hard",
        levelUpData ? "bg-gradient-to-br from-neo-yellow via-neo-orange to-neo-pink" : "bg-gradient-to-br from-neo-purple/20 to-neo-pink/20"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            className="text-xl"
          >
            ⭐
          </motion.span>
          <h4 className="font-black text-neo-black uppercase text-sm">
            {t('xp.xpGained') || 'XP Gained'}
          </h4>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
          className="bg-neo-black text-neo-cream px-3 py-1 rounded-neo font-black text-lg"
        >
          +{xpEarned}
        </motion.div>
      </div>

      {/* Breakdown items */}
      <div className="space-y-2 mb-3">
        {breakdownItems.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className={cn(
              "flex items-center justify-between px-2 py-1 rounded-neo border-2 border-neo-black/30",
              item.highlight ? "bg-neo-yellow" : "bg-neo-cream/50"
            )}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-neo-black">
              <span>{item.icon}</span>
              {item.label}
            </span>
            <span className="font-black text-neo-black">+{item.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Level info */}
      <div className="flex items-center justify-between pt-2 border-t-2 border-neo-black/20">
        <span className="text-xs font-bold text-neo-black/70 uppercase">
          {t('xp.level') || 'Level'} {newLevel}
        </span>
        <span className="text-xs font-bold text-neo-black/70">
          {t('xp.totalXpEarned') || 'Total XP'}: {newTotalXp.toLocaleString()}
        </span>
      </div>

      {/* Level Up celebration */}
      {levelUpData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 200 }}
          className="mt-3 p-3 bg-neo-yellow border-3 border-neo-black rounded-neo shadow-hard-sm text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-2xl mb-1"
          >
            🎉
          </motion.div>
          <p className="font-black text-neo-black uppercase text-sm">
            {t('xp.levelUp') || 'Level Up!'}
          </p>
          <p className="font-bold text-neo-black text-lg">
            {levelUpData.oldLevel} → {levelUpData.newLevel}
          </p>
          {levelUpData.newTitles && levelUpData.newTitles.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-xs font-bold text-neo-purple mt-1"
            >
              {t('xp.titleUnlocked') || 'Title Unlocked'}: {levelUpData.newTitles[0]}
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
});

XpBreakdownCard.displayName = 'XpBreakdownCard';

export default XpBreakdownCard;

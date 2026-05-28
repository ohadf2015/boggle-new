import { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { getXpProgress } from '@/shared/utils/adventureXpUtils';
import { getDiminishingReturnsFactor, XP_CONFIG } from '@/backend/modules/xpManager';

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
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      className={cn(
        "mt-4 p-4 rounded-neo border-3 border-neo-black shadow-hard relative overflow-hidden",
        levelUpData ? "bg-linear-to-br from-neo-lime via-neo-lime to-neo-pink" : "bg-neo-cream dark:bg-neo-navy-elevated"
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
          <m.span
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            className="text-xl"
          >
            ⭐
          </m.span>
          <h4 className="font-black text-neo-black dark:text-neo-white uppercase text-sm">
            {t('xp.xpGained')}
          </h4>
        </div>
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, ...SPRING_PRESETS.balanced }}
          className="bg-neo-black text-neo-white px-3 py-1 rounded-neo font-black text-lg"
        >
          +{xpEarned}
        </m.div>
      </div>

      {/* Breakdown items */}
      <div className="space-y-2 mb-3 relative z-10">
        {breakdownItems.map((item, index) => (
          <m.div
            key={item.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1, ...SPRING_PRESETS.balanced }}
            className={cn(
              "flex items-center justify-between px-2 py-1 rounded-neo border-2 border-neo-black/30 dark:border-neo-cream/30",
              item.highlight ? "bg-neo-lime" : "bg-neo-cream/50 dark:bg-slate-600/50"
            )}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-neo-black dark:text-neo-white">
              <span>{item.icon}</span>
              {item.label}
            </span>
            <span className="font-black text-neo-black dark:text-neo-white">+{item.value}</span>
          </m.div>
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
            <m.div
              className="h-full rounded-full bg-linear-to-r from-neo-purple via-neo-pink to-neo-purple"
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

      {/* Diminishing returns indicator */}
      {newLevel > 25 && (
        <div className="mt-2 px-2 py-1.5 rounded-neo bg-neo-black/10 dark:bg-neo-black/30 relative z-10">
          <div className="flex items-center justify-between text-[10px] font-bold text-neo-black/60 dark:text-neo-white">
            <span className="flex items-center gap-1">
              📉 {t('xp.diminishingReturns')}
            </span>
            <span>{Math.round(getDiminishingReturnsFactor(newLevel) * 100)}% {t('xp.xpRate')}</span>
          </div>
          {/* Visual rate bar */}
          <div className="mt-1 h-1.5 bg-neo-black/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-neo-lime to-neo-cyan transition-all"
              style={{ width: `${getDiminishingReturnsFactor(newLevel) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Daily cap note */}
      <div className="mt-1 text-[9px] text-neo-black/40 dark:text-neo-white text-center relative z-10">
        {t('xp.dailyCapNote', { fullRate: XP_CONFIG.DAILY_FULL_RATE })}
      </div>

      {/* Level Up celebration */}
      {levelUpData && (
        <m.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.9, ...SPRING_PRESETS.balanced }}
          className="mt-3 p-3 bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard-sm text-center relative z-10"
        >
          <m.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-2xl mb-1"
          >
            🎉
          </m.div>
          <p className="font-black text-neo-black uppercase text-sm">
            {t('xp.levelUp')}
          </p>
          <p className="font-bold text-neo-black text-lg">
            {levelUpData.oldLevel} {levelArrow} {levelUpData.newLevel}
          </p>
          {levelUpData.newTitles && levelUpData.newTitles.length > 0 && (
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, type: 'spring', stiffness: 280, damping: 26 }}
              className="text-xs font-bold text-neo-pink mt-1"
            >
              {t('xp.titleUnlocked')}: {levelUpData.newTitles[0]}
            </m.p>
          )}
        </m.div>
      )}
    </m.div>
  );
});

XpBreakdownCard.displayName = 'XpBreakdownCard';

export default XpBreakdownCard;

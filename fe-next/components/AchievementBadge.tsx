import React, { useState, memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { calculateTier, getTierProgress, TIER_COLORS, TIER_ICONS, TierName, TierColors } from '../utils/achievementTiers';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Achievement type
 */
interface Achievement {
  icon: string;
  name: string;
  description: string;
}

/**
 * AchievementBadge Props
 */
interface AchievementBadgeProps {
  achievement: Achievement;
  index?: number;
  count?: number;
  showTier?: boolean;
}

/**
 * Neo-Brutalist Achievement Badge with Tier System
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 * Tiers: Bronze (1+), Silver (10+), Gold (50+), Platinum (200+)
 * Memoized to prevent unnecessary re-renders in lists
 */
export const AchievementBadge = memo<AchievementBadgeProps>(({ achievement, index = 0, count = 0, showTier = false }) => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  // Calculate tier information
  const tier = calculateTier(count);
  const tierProgress = getTierProgress(count);
  const tierColors: TierColors | null = tier ? TIER_COLORS[tier] : null;
  const tierIcon = tier ? TIER_ICONS[tier] : null;

  // Get tier name translation
  const getTierName = (tierKey: TierName | null): string => {
    if (!tierKey) return '';
    const tierNames: Record<TierName, string> = {
      BRONZE: t('achievementTiers.bronze') || 'Bronze',
      SILVER: t('achievementTiers.silver') || 'Silver',
      GOLD: t('achievementTiers.gold') || 'Gold',
      PLATINUM: t('achievementTiers.platinum') || 'Platinum',
    };
    return tierNames[tierKey] || tierKey;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild onClick={handleClick}>
          <motion.button
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
            whileHover={{ scale: 1.05, rotate: 2, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block relative"
          >
            <Badge
              variant="cyan"
              className="px-3 py-2 text-sm font-black uppercase tracking-wide
                        border-3 rounded-md
                        shadow-hard-sm
                        hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard
                        active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
                        transition-all duration-100 cursor-pointer touch-manipulation"
              style={{
                backgroundColor: tierColors?.bg || 'var(--neo-cyan)',
                borderColor: tierColors?.border || 'var(--neo-black)',
                color: tierColors?.text || 'var(--neo-black)',
                boxShadow: tierColors?.glow ? `0 0 8px ${tierColors.glow}` : undefined,
              }}
            >
              <span className="mr-1">{achievement.icon}</span>
              {achievement.name}
            </Badge>
            {/* Tier indicator badge */}
            {showTier && tier && (
              <span
                className="absolute -top-1 -right-1 text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-neo-black shadow-sm"
                style={{ backgroundColor: tierColors?.bg }}
                title={getTierName(tier)}
              >
                {tierIcon}
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="z-50 bg-neo-purple border-3 border-neo-black shadow-hard rounded-md p-3 max-w-xs"
          onPointerDownOutside={() => setOpen(false)}
        >
          <div>
            <p className="font-black uppercase text-neo-white tracking-wide">{achievement.name}</p>
            <p className="text-xs font-bold text-neo-cyan mt-1">{achievement.description}</p>

            {/* Tier progress section */}
            {showTier && count > 0 && (
              <div className="mt-2 pt-2 border-t border-neo-cyan/30">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neo-lime font-bold">
                    {tierIcon} {getTierName(tier)}
                  </span>
                  <span className="text-neo-white/70">
                    ({t('achievementTiers.earned') || 'Earned'} {count}x)
                  </span>
                </div>

                {/* Progress to next tier */}
                {!tierProgress.isMaxTier && tierProgress.nextTier && (
                  <div className="mt-1">
                    <div className="flex justify-between text-[10px] text-neo-white/60 mb-0.5">
                      <span>{tierProgress.currentCount}/{tierProgress.nextThreshold}</span>
                      <span>{TIER_ICONS[tierProgress.nextTier]} {getTierName(tierProgress.nextTier)}</span>
                    </div>
                    <div className="h-1.5 bg-neo-black/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neo-lime transition-all duration-300"
                        style={{ width: `${tierProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {tierProgress.isMaxTier && (
                  <p className="text-[10px] text-neo-lime mt-1 font-bold">
                    {t('achievementTiers.maxTier') || 'Max Tier Reached!'}
                  </p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

AchievementBadge.displayName = 'AchievementBadge';

import React, { useState, memo, useMemo, useRef } from 'react';
import { m } from 'framer-motion';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { calculateTier, getTierProgress, TIER_COLORS, TIER_ICONS, TierName, TierColors } from '../utils/achievementTiers';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Achievement type - supports both localized and unlocalized formats
 * Unlocalized format: { key, icon } - backend sends this, frontend localizes
 * Localized format: { name, description, icon } - legacy/backwards compatibility
 */
interface Achievement {
  icon: string;
  key?: string;        // Unlocalized format - used to look up translation
  name?: string;       // Localized format (legacy)
  description?: string; // Localized format (legacy)
}

/**
 * AchievementBadge Props
 */
interface AchievementBadgeProps {
  achievement: Achievement;
  index?: number;
  count?: number;
  showTier?: boolean;
  locked?: boolean; // If true, shows achievement as locked/not yet earned
}

/**
 * Neo-Brutalist Achievement Badge with Tier System
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 * Tiers: Bronze (1+), Silver (10+), Gold (50+), Platinum (200+)
 * Memoized to prevent unnecessary re-renders in lists
 * Note: Achievements always use the user's UI language preference, not game language
 */
export const AchievementBadge = memo<AchievementBadgeProps>(({ achievement, index = 0, count = 0, showTier = false, locked = false }) => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const isTouchDevice = useRef(false);
  const justOpened = useRef(false);

  // Localize achievement using user's UI language preference
  // Achievement can have either { key, icon } (unlocalized) or { name, description, icon } (legacy localized)
  const localizedAchievement = useMemo(() => {
    if (achievement.key) {
      return {
        icon: achievement.icon,
        name: t(`achievements.${achievement.key}.name`) || achievement.key,
        description: t(`achievements.${achievement.key}.description`)
      };
    }
    // Legacy format: already has name and description
    return {
      icon: achievement.icon,
      name: achievement.name || '',
      description: achievement.description || ''
    };
  }, [achievement, t]);

  const handleTouchStart = () => {
    isTouchDevice.current = true;
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) {
      justOpened.current = true;
      setTimeout(() => { justOpened.current = false; }, 200);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // On touch devices, ignore Radix's automatic open/close from hover simulation
    // We'll rely solely on the click handler to control the state
    if (isTouchDevice.current) {
      return;
    }
    setOpen(newOpen);
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
      BRONZE: t('achievementTiers.bronze'),
      SILVER: t('achievementTiers.silver'),
      GOLD: t('achievementTiers.gold'),
      PLATINUM: t('achievementTiers.platinum'),
    };
    return tierNames[tierKey] || tierKey;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild onClick={handleClick} onTouchStart={handleTouchStart}>
          <m.button
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
            whileHover={{ scale: 1.05, rotate: 2, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block relative"
            aria-label={`${localizedAchievement.name}: ${localizedAchievement.description}${locked ? ' (Locked)' : ''}`}
          >
            <Badge
              variant="cyan"
              className="px-3 py-2 text-sm font-black uppercase tracking-wide
                        border-3 rounded-md
                        shadow-hard-sm
                        hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard
                        active:translate-x-px active:translate-y-px active:shadow-none
                        transition-all duration-100 cursor-pointer touch-manipulation"
              style={{
                backgroundColor: locked ? '#808080' : (tierColors?.bg || 'var(--neo-cyan)'),
                borderColor: locked ? '#404040' : (tierColors?.border || 'rgb(var(--neo-black))'),
                color: locked ? '#e0e0e0' : (tierColors?.text || 'rgb(var(--neo-black))'),
                boxShadow: locked ? 'none' : (tierColors?.glow ? `0 0 8px ${tierColors.glow}` : undefined),
                opacity: locked ? 0.6 : 1,
                filter: locked ? 'grayscale(100%)' : undefined,
              }}
            >
              <span className="me-1">{localizedAchievement.icon}</span>
              {localizedAchievement.name}
            </Badge>
            {/* Lock icon for locked achievements */}
            {locked && (
              <span
                className="absolute -top-1 -right-1 text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-600 bg-neo-navy-elevated shadow-xs"
                title={t('profile.locked')}
              >
                🔒
              </span>
            )}
            {/* Tier indicator badge (only for earned achievements) */}
            {showTier && tier && !locked && (
              <span
                className="absolute -top-1 -right-1 text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-neo-black shadow-xs"
                style={{ backgroundColor: tierColors?.bg }}
                title={getTierName(tier)}
              >
                {tierIcon}
              </span>
            )}
          </m.button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="z-50 bg-neo-purple text-white border-3 border-neo-black shadow-hard rounded-md p-3 max-w-xs"
          onPointerDownOutside={(e) => {
            if (justOpened.current) { e.preventDefault(); return; }
            setOpen(false);
          }}
        >
          <div>
            {/* Show lock indicator for locked achievements */}
            {locked && (
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm">🔒</span>
                <span className="text-[11px] sm:text-xs uppercase font-bold text-neo-cyan tracking-wide">
                  {t('profile.locked')}
                </span>
              </div>
            )}
            <p className="font-black uppercase text-neo-white tracking-wide">{localizedAchievement.name}</p>
            <p className="text-xs font-bold text-neo-cyan mt-1">{localizedAchievement.description}</p>

            {/* Tier progress section (only for earned achievements) */}
            {showTier && count > 0 && !locked && (
              <div className="mt-2 pt-2 border-t border-neo-cyan/30">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neo-lime font-bold">
                    {tierIcon} {getTierName(tier)}
                  </span>
                  <span className="text-neo-white">
                    ({t('achievementTiers.earned')} {count}x)
                  </span>
                </div>

                {/* Progress to next tier */}
                {!tierProgress.isMaxTier && tierProgress.nextTier && (
                  <div className="mt-1">
                    <div className="flex justify-between text-[11px] sm:text-xs text-neo-white mb-0.5">
                      <span>{tierProgress.currentCount}/{tierProgress.nextThreshold}</span>
                      <span>{TIER_ICONS[tierProgress.nextTier]} {getTierName(tierProgress.nextTier)}</span>
                    </div>
                    <div className="h-1.5 bg-neo-black/50 text-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neo-lime text-neo-black transition-all duration-300"
                        style={{ width: `${tierProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {tierProgress.isMaxTier && (
                  <p className="text-[11px] sm:text-xs text-neo-lime mt-1 font-bold">
                    {t('achievementTiers.maxTier')}
                  </p>
                )}
              </div>
            )}

            {/* Hint for locked achievements */}
            {locked && (
              <p className="text-[11px] sm:text-xs text-neo-white mt-2 italic">
                {t('profile.earnThisAchievement')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

AchievementBadge.displayName = 'AchievementBadge';

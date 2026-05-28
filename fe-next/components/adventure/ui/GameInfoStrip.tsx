/**
 * GameInfoStrip — Compact inline strip showing theme, mechanic, and upgrade info.
 * Rendered inside GameHeader's info strip slot (in-flow, not fixed/floating).
 * Replaces the old floating AdventureThemeBanner, MechanicIndicator, and AdventureUpgradeHUD.
 */

'use client';

import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getActiveUpgradeIndicators } from '@/lib/adventure';
import { getUpgrade } from '@/lib/adventure/upgradeConfig';

interface GameInfoStripProps {
  /** World theme translation key */
  themeDisplayKey?: string;
  /** Themed words found / total */
  themedWordsFound?: number;
  themedWordCount?: number;
  themedBonusMultiplier?: number;
  worldColorPrimary?: string;
  /** Active world mechanic */
  mechanic?: string | null;
  mechanicHitCount?: number;
  /** Upgrade state for badge display */
  upgradeState?: Record<string, number>;
  upgradeTriggered?: { upgradeId: string; effectValue: number } | null;
}

export const GameInfoStrip = memo(function GameInfoStrip({
  themeDisplayKey,
  themedWordsFound = 0,
  themedWordCount = 0,
  themedBonusMultiplier = 1,
  worldColorPrimary,
  mechanic,
  mechanicHitCount = 0,
  upgradeState,
  upgradeTriggered,
}: GameInfoStripProps) {
  const { t } = useLanguage();

  const hasTheme = !!themeDisplayKey;
  const hasMechanic = !!mechanic;
  const indicators = upgradeState ? getActiveUpgradeIndicators(upgradeState) : [];
  const hasUpgrades = indicators.length > 0;

  if (!hasTheme && !hasMechanic && !hasUpgrades) return null;

  const bonusPercent = Math.round((themedBonusMultiplier - 1) * 100);
  const colorClass = worldColorPrimary ? `text-${worldColorPrimary}` : 'text-neo-lime';

  return (
    <>
      {/* Theme info */}
      {hasTheme && (
        <>
          <span className={cn('font-black truncate', colorClass)}>
            {t(themeDisplayKey!)}
          </span>
          {bonusPercent > 0 && (
            <span className="text-neo-lime/70 font-bold shrink-0">
              +{bonusPercent}%
            </span>
          )}
          {themedWordCount > 0 && (
            <span className="text-neo-white shrink-0 tabular-nums">
              {themedWordsFound}/{themedWordCount}
            </span>
          )}
        </>
      )}

      {/* Separator */}
      {hasTheme && hasMechanic && (
        <span className="text-neo-white">|</span>
      )}

      {/* Mechanic info */}
      {hasMechanic && (
        <>
          <Sparkles className="w-3 h-3 text-neo-purple-light shrink-0" />
          <span className="font-bold text-neo-purple-light truncate">
            {t(`adventure.mechanic.${mechanic}`)}
          </span>
          {mechanicHitCount > 0 && (
            <AdaptiveMotion.span
              className={cn(
                'font-black',
                mechanicHitCount >= 3 ? 'text-neo-pink' : mechanicHitCount >= 2 ? 'text-neo-cyan' : 'text-neo-lime'
              )}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              key={mechanicHitCount}
            >
              x{mechanicHitCount}
            </AdaptiveMotion.span>
          )}
        </>
      )}

      {/* Separator */}
      {(hasTheme || hasMechanic) && hasUpgrades && (
        <span className="text-neo-white">|</span>
      )}

      {/* Upgrade badges — compact inline */}
      {hasUpgrades && indicators.map(({ upgradeId, hudIcon }) => {
        const isTriggered = upgradeTriggered?.upgradeId === upgradeId;
        const upgrade = getUpgrade(upgradeId);
        return (
          <span
            key={upgradeId}
            className={cn(
              'transition-transform duration-300 leading-none',
              isTriggered ? 'scale-125' : ''
            )}
            title={upgrade ? t(upgrade.nameKey) : upgradeId}
          >
            <span className={cn(
              'text-sm',
              isTriggered ? 'animate-neo-pop' : ''
            )}>
              {hudIcon}
            </span>
          </span>
        );
      })}
    </>
  );
});

export default GameInfoStrip;

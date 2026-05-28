'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { XpGainedData, LevelUpData } from './types';

interface BonusBadgesRowProps {
  /** Total combo bonus points earned */
  comboBonus?: number;
  /** Total fire round bonus points earned */
  fireRoundBonus?: number;
  /** XP earned data (for authenticated users) */
  xpGainedData?: XpGainedData | null;
  /** Level up data (if user leveled up) */
  levelUpData?: LevelUpData | null;
  /** Additional className */
  className?: string;
  /** Badge size variant */
  size?: 'sm' | 'md';
}

/**
 * BonusBadgesRow - Displays combo, fire round, XP, and level up badges
 *
 * Used in:
 * - SinglePlayerResults (desktop and mobile)
 * - ConsolidatedPlayerCard (multiplayer current player)
 * - ResultsPlayerCard (other players - without XP)
 *
 * @example
 * ```tsx
 * <BonusBadgesRow
 *   comboBonus={15}
 *   fireRoundBonus={10}
 *   xpGainedData={{ xpEarned: 50, ... }}
 *   levelUpData={{ oldLevel: 3, newLevel: 4, ... }}
 * />
 * ```
 */
const BonusBadgesRow: React.FC<BonusBadgesRowProps> = memo(({
  comboBonus = 0,
  fireRoundBonus = 0,
  xpGainedData,
  levelUpData,
  className,
  size = 'md',
}) => {
  const { dir } = useLanguage();
  const levelArrow = dir === 'rtl' ? '←' : '→';

  const hasAnyBadge = comboBonus > 0 || fireRoundBonus > 0 || xpGainedData || levelUpData;

  if (!hasAnyBadge) {
    return null;
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-[10px] border-2'
    : 'px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs border-3';

  return (
    <div className={cn('flex items-center gap-1.5 sm:gap-2 flex-wrap', className)}>
      {/* Combo Bonus */}
      {comboBonus > 0 && (
        <m.span
          initial={{ scale: 0, rotate: -15, y: 10 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          whileHover={{ scale: 1.12, rotate: -3, y: -2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 10 }}
          className={cn(
            'bg-neo-red border-neo-black rounded-neo shadow-hard-sm text-neo-black font-black cursor-default',
            sizeClasses
          )}
        >
          ⚡ +{comboBonus}
        </m.span>
      )}

      {/* Fire Round Bonus */}
      {fireRoundBonus > 0 && (
        <m.span
          initial={{ scale: 0, rotate: 15, y: 10 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          whileHover={{ scale: 1.12, rotate: 3, y: -2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 10 }}
          className={cn(
            'bg-neo-red border-neo-black rounded-neo shadow-hard-sm text-neo-white font-black cursor-default',
            sizeClasses
          )}
        >
          🔥 +{fireRoundBonus}
        </m.span>
      )}

      {/* XP Earned */}
      {xpGainedData && (
        <m.span
          initial={{ scale: 0, rotate: -15, y: 10 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          whileHover={{ scale: 1.12, rotate: -3, y: -2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 10 }}
          className={cn(
            'bg-neo-pink border-neo-black rounded-neo shadow-hard-sm text-neo-white font-black cursor-default',
            sizeClasses
          )}
        >
          ⭐ +{xpGainedData.xpEarned} XP
        </m.span>
      )}

      {/* Level Up */}
      {levelUpData && (
        <m.span
          initial={{ scale: 0, rotate: 15, y: 10 }}
          animate={{ scale: [0, 1.25, 0.9, 1.05, 1], rotate: [15, -5, 3, 0], y: [10, -4, 2, 0] }}
          whileHover={{ scale: 1.15, rotate: -3, y: -3 }}
          whileTap={{ scale: 0.9 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 10 }}
          className={cn(
            'bg-neo-lime border-neo-black rounded-neo shadow-hard-sm text-neo-black font-black cursor-default',
            sizeClasses
          )}
        >
          🎉 Lvl {levelUpData.oldLevel} {levelArrow} {levelUpData.newLevel}
        </m.span>
      )}
    </div>
  );
});

BonusBadgesRow.displayName = 'BonusBadgesRow';

export default BonusBadgesRow;

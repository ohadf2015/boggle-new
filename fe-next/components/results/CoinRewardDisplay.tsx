'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface CoinReward {
  awarded: number;
  breakdown: {
    base: number;
    scoreBonus: number;
    placement: number;
  };
}

interface CoinRewardDisplayProps {
  /** Coin reward data */
  reward: CoinReward | null;
  /** Display variant */
  variant?: 'full' | 'compact' | 'inline';
  /** Show breakdown details */
  showBreakdown?: boolean;
  /** Show usage hint text */
  showHint?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * CoinRewardDisplay - Shows coin rewards earned from a game
 *
 * Used in:
 * - SinglePlayerResults (both desktop and mobile views)
 * - ResultsPage (if coins are awarded for multiplayer)
 *
 * Variants:
 * - full: Large card with breakdown and hint (desktop)
 * - compact: Medium card with breakdown (mobile Results tab)
 * - inline: Small horizontal badge (landscape mode)
 *
 * @example
 * ```tsx
 * <CoinRewardDisplay
 *   reward={{ awarded: 15, breakdown: { base: 5, scoreBonus: 5, placement: 5 } }}
 *   variant="full"
 *   showBreakdown
 *   showHint
 * />
 * ```
 */
const CoinRewardDisplay: React.FC<CoinRewardDisplayProps> = memo(({
  reward,
  variant = 'full',
  showBreakdown = true,
  showHint = false,
  className,
}) => {
  const { t } = useLanguage();

  if (!reward || reward.awarded === 0) {
    return null;
  }

  // Inline variant - small badge for landscape mode
  if (variant === 'inline') {
    return (
      <div className={cn(
        'bg-neo-yellow border-2 border-neo-black rounded-neo px-3 py-1 text-center',
        className
      )}>
        <div className="flex items-center justify-center gap-1">
          <Coins className="w-3 h-3 text-neo-black" />
          <span className="font-black text-neo-black">+{reward.awarded}</span>
        </div>
        <div className="text-[8px] font-bold uppercase text-neo-black/70">
          {t('reveal.coins') || 'Coins'}
        </div>
      </div>
    );
  }

  // Compact variant - medium size for mobile
  if (variant === 'compact') {
    return (
      <div className={cn(
        'bg-gradient-to-r from-neo-yellow to-amber-400 rounded-neo border-3 border-neo-black shadow-hard px-4 py-2',
        className
      )}>
        <div className="flex items-center justify-center gap-2">
          <Coins className="w-5 h-5 text-neo-black" />
          <span className="font-black text-xl text-neo-black">+{reward.awarded}</span>
          <span className="text-sm font-bold text-neo-black/70">
            {t('reveal.coins') || 'Coins'}
          </span>
        </div>
      </div>
    );
  }

  // Full variant - large card with breakdown and hint
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring' }}
      className={cn(
        'px-4 py-3 bg-gradient-to-r from-neo-yellow to-amber-400 rounded-neo border-3 border-neo-black shadow-hard',
        className
      )}
    >
      {/* Main reward display */}
      <div className="flex items-center justify-center gap-2 mb-1">
        <Coins className="w-5 h-5 text-neo-black" />
        <span className="font-black text-xl text-neo-black">+{reward.awarded}</span>
        <span className="text-sm font-bold text-neo-black/70">
          {t('reveal.coins') || 'Coins'}
        </span>
      </div>

      {/* Breakdown */}
      {showBreakdown && (
        <div className="flex items-center justify-center gap-3 text-xs text-neo-black/70 font-medium">
          {reward.breakdown.base > 0 && (
            <span>{t('reveal.base') || 'Base'}: +{reward.breakdown.base}</span>
          )}
          {reward.breakdown.scoreBonus > 0 && (
            <span>{t('coins.score') || 'Score'}: +{reward.breakdown.scoreBonus}</span>
          )}
          {reward.breakdown.placement > 0 && (
            <span>🏆 {t('coins.placement') || 'Placement'}: +{reward.breakdown.placement}</span>
          )}
        </div>
      )}

      {/* Usage hint */}
      {showHint && (
        <p className="text-xs text-neo-black/60 mt-1 text-center">
          {t('reveal.usedForReveals') || 'Use coins to reveal words in single player games!'}
        </p>
      )}
    </motion.div>
  );
});

CoinRewardDisplay.displayName = 'CoinRewardDisplay';

export default CoinRewardDisplay;

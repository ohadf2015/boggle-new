'use client';

import React, { memo } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';

interface MobileCompactRewardsProps {
  /** Current win streak (0 = no streak) */
  winStreak?: number;
  /** Coins earned (0 = no coins) */
  coins?: number;
  /** Whether user is authenticated (affects coin display) */
  isAuthenticated?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * MobileCompactRewards - Single-row rewards display for mobile
 *
 * Shows win streak and coins in a compact inline format.
 * Designed for below-the-fold secondary info.
 */
const MobileCompactRewards: React.FC<MobileCompactRewardsProps> = memo(({
  winStreak = 0,
  coins = 0,
  isAuthenticated = true,
  className,
}) => {
  const { t, language } = useLanguage();

  const hasStreak = winStreak > 0;
  const hasCoins = coins > 0;

  if (!hasStreak && !hasCoins) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center justify-center gap-4 py-2 px-3 bg-white/5 rounded-neo border border-white/10',
      className
    )}>
      {/* Win Streak */}
      {hasStreak && (
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🔥</span>
          <span className="text-base font-black text-neo-orange">{winStreak}</span>
          <span className="text-xs text-white font-bold">
            {t('results.winStreak')}
          </span>
        </div>
      )}

      {/* Separator */}
      {hasStreak && hasCoins && (
        <div className="w-px h-4 bg-white/20" />
      )}

      {/* Coins */}
      {hasCoins && (
        <div className="flex items-center gap-1.5">
          <Coins className={cn(
            'w-4 h-4',
            isAuthenticated ? 'text-neo-lime' : 'text-amber-400/60'
          )} />
          <span className={cn(
            'text-base font-black',
            isAuthenticated ? 'text-neo-lime' : 'text-amber-400/60'
          )}>
            +{safeToLocaleString(coins, language)}
          </span>
          {!isAuthenticated && (
            <span className="text-[10px] text-white">
              {t('coins.signInShort')}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

MobileCompactRewards.displayName = 'MobileCompactRewards';

export default MobileCompactRewards;

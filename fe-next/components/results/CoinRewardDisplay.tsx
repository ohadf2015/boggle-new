'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Coins, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';

export interface CoinReward {
  awarded: number;
  breakdown: {
    base: number;
    scoreBonus?: number;
    placement?: number;
    efficiency?: number;
    streak?: number;
    streakBonus?: number;
  };
}

/** Display mode for coin rewards */
export type CoinRewardMode = 'earned' | 'teasing';

interface CoinRewardDisplayProps {
  /** Coin reward data */
  reward: CoinReward | null;
  /** Display mode: 'earned' shows actual reward, 'teasing' shows what guest would get if signed in */
  mode?: CoinRewardMode;
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
 * Modes:
 * - earned: Shows actual coins earned (for authenticated users)
 * - teasing: Shows potential coins for guests with sign-in prompt
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
 *   mode="earned"
 *   variant="full"
 *   showBreakdown
 *   showHint
 * />
 * ```
 */
const CoinRewardDisplay: React.FC<CoinRewardDisplayProps> = memo(({
  reward,
  mode = 'earned',
  variant = 'full',
  showBreakdown = true,
  showHint = false,
  className,
}) => {
  const { t, language } = useLanguage();

  if (!reward || reward.awarded === 0) {
    return null;
  }

  const isTeasing = mode === 'teasing';

  // Teasing mode - show what guest could earn if signed in
  if (isTeasing) {
    return (
      <TeasingDisplay
        reward={reward}
        variant={variant}
        className={className}
        t={t}
        language={language}
      />
    );
  }

  // Inline variant - small badge for landscape mode
  if (variant === 'inline') {
    return (
      <div className={cn(
        'bg-neo-lime border-2 border-neo-black rounded-neo px-3 py-1 text-center',
        className
      )}>
        <div className="flex items-center justify-center gap-1">
          <Coins className="w-3 h-3 text-neo-black" />
          <span className="font-black text-neo-black">+{safeToLocaleString(reward.awarded, language)}</span>
        </div>
        <div className="text-[10px] font-bold uppercase text-neo-black/70">
          {t('reveal.coins')}
        </div>
      </div>
    );
  }

  // Compact variant - medium size for mobile
  if (variant === 'compact') {
    return (
      <div className={cn(
        'bg-linear-to-r from-neo-lime to-amber-400 rounded-neo border-3 border-neo-black shadow-hard px-4 py-2',
        className
      )}>
        <div className="flex items-center justify-center gap-2">
          <Coins className="w-5 h-5 text-neo-black" />
          <span className="font-black text-xl text-neo-black">+{safeToLocaleString(reward.awarded, language)}</span>
          <span className="text-sm font-bold text-neo-black/70">
            {t('reveal.coins')}
          </span>
        </div>
      </div>
    );
  }

  // Full variant - large card with breakdown and hint
  return (
    <m.div
      initial={{ scale: 0.8, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 350, damping: 18 }}
      className={cn(
        'px-4 py-3 bg-linear-to-r from-neo-lime via-lime-300 to-amber-400 rounded-neo border-3 border-neo-black shadow-hard relative overflow-hidden',
        className
      )}
    >
      {/* Diagonal stripes for texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgb(var(--neo-black)) 8px, rgb(var(--neo-black)) 10px)',
        }}
      />
      {/* Main reward display */}
      <div className="flex items-center justify-center gap-2 mb-1 relative z-10">
        <m.div
          animate={{ rotate: [0, -10, 10, -5, 0] }}
          transition={{ delay: 0.8, duration: 0.5, ease: 'easeInOut' }}
        >
          <Coins className="w-6 h-6 text-neo-black" />
        </m.div>
        <span className="font-black text-2xl text-neo-black">+{safeToLocaleString(reward.awarded, language)}</span>
        <span className="text-sm font-bold text-neo-black/70">
          {t('reveal.coins')}
        </span>
      </div>

      {/* Breakdown */}
      {showBreakdown && (
        <div className="flex items-center justify-center gap-3 text-xs text-neo-black/70 font-bold flex-wrap relative z-10">
          {reward.breakdown.base > 0 && (
            <span>{t('reveal.base')}: +{safeToLocaleString(reward.breakdown.base, language)}</span>
          )}
          {(reward.breakdown.scoreBonus ?? 0) > 0 && (
            <span>{t('coins.score')}: +{safeToLocaleString(reward.breakdown.scoreBonus ?? 0, language)}</span>
          )}
          {(reward.breakdown.placement ?? 0) > 0 && (
            <span>{t('coins.placement')}: +{safeToLocaleString(reward.breakdown.placement ?? 0, language)}</span>
          )}
          {(reward.breakdown.efficiency ?? 0) > 0 && (
            <span>{t('coins.efficiency')}: +{safeToLocaleString(reward.breakdown.efficiency ?? 0, language)}</span>
          )}
          {(reward.breakdown.streak ?? 0) > 0 && (
            <span>{t('coins.streak')}: +{safeToLocaleString(reward.breakdown.streak ?? 0, language)}</span>
          )}
          {(reward.breakdown.streakBonus ?? 0) > 0 && (
            <span className="text-amber-600 font-semibold">🔥 +{safeToLocaleString(reward.breakdown.streakBonus ?? 0, language)}</span>
          )}
        </div>
      )}

      {/* Usage hint */}
      {showHint && (
        <p className="text-xs text-neo-black/60 mt-1 text-center">
          {t('reveal.usedForReveals')}
        </p>
      )}
    </m.div>
  );
});

/**
 * TeasingDisplay - Shows potential coins for guests with sign-in prompt
 */
interface TeasingDisplayProps {
  reward: CoinReward;
  variant: 'full' | 'compact' | 'inline';
  className?: string;
  t: (key: string) => string;
  language: string;
}

const TeasingDisplay: React.FC<TeasingDisplayProps> = memo(({
  reward,
  variant,
  className,
  t,
  language,
}) => {
  const teasingMessage = t('coins.guestTeasing');
  const formattedMessage = teasingMessage.replace('{amount}', safeToLocaleString(reward.awarded, language));

  // Inline variant - small muted badge
  if (variant === 'inline') {
    return (
      <div className={cn(
        'bg-slate-600/50 border-2 border-slate-500 rounded-neo px-3 py-1 text-center',
        className
      )}>
        <div className="flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-neo-white" />
          <span className="font-bold text-neo-white text-xs">+{safeToLocaleString(reward.awarded, language)}</span>
        </div>
        <div className="text-[9px] font-bold text-neo-white">
          {t('coins.signInShort')}
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn(
        'bg-neo-navy-elevated/80 rounded-neo border-3 border-slate-500 shadow-hard px-4 py-2',
        className
      )}>
        <div className="flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <Coins className="w-5 h-5 text-amber-400/60" />
          <span className="font-black text-xl text-amber-400/80">+{safeToLocaleString(reward.awarded, language)}</span>
        </div>
        <p className="text-xs text-neo-white mt-1 text-center">
          {formattedMessage}
        </p>
      </div>
    );
  }

  // Full variant - prominent teasing card
  return (
    <m.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'px-4 py-3 bg-neo-navy-elevated/80 rounded-neo border-3 border-slate-500 shadow-hard',
        className
      )}
    >
      {/* Locked reward display */}
      <div className="flex items-center justify-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-amber-400" />
        <Coins className="w-5 h-5 text-amber-400/60" />
        <span className="font-black text-xl text-amber-400/80">+{safeToLocaleString(reward.awarded, language)}</span>
        <span className="text-sm font-bold text-neo-white">
          {t('reveal.coins')}
        </span>
      </div>

      {/* Teasing message */}
      <p className="text-sm text-neo-white text-center font-bold">
        {formattedMessage}
      </p>
    </m.div>
  );
});

TeasingDisplay.displayName = 'TeasingDisplay';

CoinRewardDisplay.displayName = 'CoinRewardDisplay';

export default CoinRewardDisplay;

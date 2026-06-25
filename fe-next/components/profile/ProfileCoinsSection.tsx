'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Coins, Gamepad2, Trophy, BarChart3, Target } from 'lucide-react';
import { CoinBalance } from '@/components/CoinBalance';
import { EarnCoinsOfferwallButton } from '@/components/ads/EarnCoinsOfferwall';
import RewardedAdGoldButton from '@/components/ads/RewardedAdGoldButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface ProfileCoinsSectionProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  compact?: boolean;
  delay?: number;
}

interface BreakdownTile {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export function ProfileCoinsSection({
  profile,
  isDarkMode: _isDarkMode,
  compact = false,
  delay = 0.08,
}: ProfileCoinsSectionProps): React.ReactNode {
  const { t } = useLanguage();

  const tiles: BreakdownTile[] = [
    { icon: <Gamepad2 strokeWidth={2.5} className="w-4 h-4" />, label: t('coins.perGame'),       value: '+10–15' },
    { icon: <Trophy strokeWidth={2.5} className="w-4 h-4" />,   label: t('coins.winBonus'),      value: '+25' },
    { icon: <BarChart3 strokeWidth={2.5} className="w-4 h-4" />,label: t('coins.scoreBonus'),    value: '÷10' },
    { icon: <Target strokeWidth={2.5} className="w-4 h-4" />,   label: t('coins.dailyChallenge'),value: '+25–95' },
  ];
  const visibleTiles = compact ? tiles.slice(0, 2) : tiles;

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'relative bg-neo-navy-light overflow-hidden mb-4',
        'border-3 border-neo-black rounded-neo shadow-hard-lg',
        compact ? 'p-4' : 'p-5',
      )}
    >
      {/* Yellow halftone ribbon — top edge (semantic: gold/coins) */}
      <div className="absolute top-0 inset-x-0 h-2.5 bg-neo-yellow">
        <div className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-overlay" aria-hidden />
      </div>

      <div className={cn('flex items-center justify-between gap-3', compact ? 'mt-2 mb-3' : 'mt-3 mb-4')}>
        <h2 className={cn(
          'font-black font-neo-display uppercase tracking-tight flex items-center gap-2.5 text-neo-white',
          compact ? 'text-lg' : 'text-2xl',
        )}>
          <span className={cn(
            'flex items-center justify-center bg-neo-yellow text-neo-black',
            'border-2 border-neo-black rounded-neo shadow-hard-sm',
            compact ? 'w-8 h-8' : 'w-10 h-10',
          )}>
            <Coins strokeWidth={2.75} className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          </span>
          {t('coins.title')}
        </h2>

        <CoinBalance coins={profile?.total_coins || 0} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Earning breakdown — equal-weight tiles, no emoji */}
      <div className={cn(
        'grid gap-2',
        compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
      )}>
        {visibleTiles.map((tile) => (
          <div
            key={tile.label}
            className={cn(
              'flex items-center gap-2 px-2.5 py-2',
              'bg-neo-black/40 border-2 border-neo-black rounded-neo',
            )}
          >
            <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded bg-neo-yellow text-neo-black border border-neo-black">
              {tile.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-neo-white truncate leading-none">
                {tile.label}
              </p>
              <p className="font-neo-display font-black text-base text-neo-yellow leading-tight tabular-nums">
                {tile.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Lifetime earned — same plate treatment as XP totals */}
      <div className="mt-3 flex items-center justify-between gap-3 px-3 py-2.5 bg-neo-black/40 border-2 border-neo-black rounded-neo">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neo-white">
          {t('coins.lifetimeEarned')}
        </span>
        <span className="font-neo-display font-black text-xl text-neo-yellow tabular-nums">
          {(profile?.lifetime_coins_earned || 0).toLocaleString()}
        </span>
      </div>

      {/* Discoverable rewarded-ad option — watch a Monetag rewarded ad for coins.
          Self-hides when no provider can serve (canShowAd false) or the daily cap
          is hit, so it only appears when it can actually grant. */}
      <RewardedAdGoldButton goldAmount={20} surface="profile_coins" size="md" className="mt-3 w-full justify-center" />

      {/* Pay-per-action offerwall — self-hides unless configured + web (dark by default). */}
      <EarnCoinsOfferwallButton size="md" className="mt-3 w-full" />
    </m.div>
  );
}

export default ProfileCoinsSection;

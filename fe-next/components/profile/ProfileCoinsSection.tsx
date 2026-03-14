'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CoinBalance } from '@/components/CoinBalance';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface ProfileCoinsSectionProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  compact?: boolean;
  delay?: number;
}

export function ProfileCoinsSection({
  profile,
  isDarkMode,
  compact = false,
  delay = 0.08
}: ProfileCoinsSectionProps): React.ReactNode {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-3xl mb-4 border-3 border-neo-yellow shadow-hard-yellow',
        compact ? 'p-4' : 'p-6',
        'bg-slate-800/80'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn(
          'font-black font-neo-display uppercase flex items-center gap-2',
          compact ? 'text-lg' : 'text-xl',
          'text-white'
        )}>
          <span className="text-neo-yellow">💰</span>
          {t('coins.title')}
        </h2>
        <div className="flex items-center gap-2 bg-black p-3 rounded-xl border-3 border-neo-black shadow-hard-sm">
          <CoinBalance coins={profile?.total_coins || 0} size={compact ? 'sm' : 'md'} />
        </div>
      </div>

      {!compact && (
        <p className="text-sm text-gray-400 mb-4">
          {t('coins.description')}
        </p>
      )}

      {/* Coin earning breakdown */}
      <div className={cn(
        'grid gap-3 p-3 rounded-xl bg-black/40 border-3 border-neo-black',
        compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
      )}>
        <div className="text-center p-2">
          <span className="text-lg">🎮</span>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">
            {t('coins.perGame')}
          </p>
          <p className="font-black text-neo-yellow text-sm">+10-15</p>
        </div>
        <div className="text-center p-2">
          <span className="text-lg">🏆</span>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">
            {t('coins.winBonus')}
          </p>
          <p className="font-black text-neo-yellow text-sm">+25</p>
        </div>
        {!compact && (
          <>
            <div className="text-center p-2">
              <span className="text-lg">📊</span>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">
                {t('coins.scoreBonus')}
              </p>
              <p className="font-black text-neo-yellow text-sm">+score/10</p>
            </div>
            <div className="text-center p-2">
              <span className="text-lg">🎯</span>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">
                {t('coins.dailyChallenge')}
              </p>
              <p className="font-black text-neo-yellow text-sm">+25-95</p>
            </div>
          </>
        )}
      </div>

      {/* Lifetime stats */}
      <div className="mt-3 p-3 bg-black/40 rounded-xl border-3 border-neo-black flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
          {t('coins.lifetimeEarned')}
        </span>
        <span className="font-black text-neo-yellow text-lg">
          {(profile?.lifetime_coins_earned || 0).toLocaleString()} 💰
        </span>
      </div>
    </motion.div>
  );
}

export default ProfileCoinsSection;

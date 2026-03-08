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
        'rounded-2xl mb-4',
        compact ? 'p-3' : 'p-4 sm:p-6',
        isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className={cn(
          'font-bold flex items-center gap-2',
          compact ? 'text-lg' : 'text-xl',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          <span className={compact ? 'text-xl' : 'text-2xl'}>💰</span>
          {t('coins.title')}
        </h2>
        <CoinBalance coins={profile?.total_coins || 0} size={compact ? 'sm' : 'md'} />
      </div>

      {!compact && (
        <p className={cn(
          'text-sm mb-4',
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        )}>
          {t('coins.description')}
        </p>
      )}

      {/* Coin earning breakdown */}
      <div className={cn(
        'grid gap-3 p-3 rounded-xl',
        compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
        isDarkMode ? 'bg-slate-900/50' : 'bg-gray-50'
      )}>
        <div className="text-center">
          <span className="text-lg">🎮</span>
          <p className={cn('text-xs font-medium mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
            {t('coins.perGame')}
          </p>
          <p className="font-bold text-neo-lime text-sm">+10-15</p>
        </div>
        <div className="text-center">
          <span className="text-lg">🏆</span>
          <p className={cn('text-xs font-medium mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
            {t('coins.winBonus')}
          </p>
          <p className="font-bold text-neo-lime text-sm">+25</p>
        </div>
        {!compact && (
          <>
            <div className="text-center">
              <span className="text-lg">📊</span>
              <p className={cn('text-xs font-medium mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {t('coins.scoreBonus')}
              </p>
              <p className="font-bold text-neo-lime text-sm">+score/10</p>
            </div>
            <div className="text-center">
              <span className="text-lg">🎯</span>
              <p className={cn('text-xs font-medium mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {t('coins.dailyChallenge')}
              </p>
              <p className="font-bold text-neo-lime text-sm">+25-95</p>
            </div>
          </>
        )}
      </div>

      {/* Lifetime stats */}
      <div className={cn(
        'mt-3 pt-3 border-t flex items-center justify-between',
        isDarkMode ? 'border-slate-700' : 'border-gray-200'
      )}>
        <p className={cn('text-sm', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
          {t('coins.lifetimeEarned')}:
        </p>
        <span className="font-bold text-neo-lime">
          {(profile?.lifetime_coins_earned || 0).toLocaleString()} 💰
        </span>
      </div>
    </motion.div>
  );
}

export default ProfileCoinsSection;

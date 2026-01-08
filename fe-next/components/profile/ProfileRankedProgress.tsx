'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface ProfileRankedProgressProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  canPlayRanked: boolean;
  gamesUntilRanked: number;
  delay?: number;
}

export function ProfileRankedProgress({
  profile,
  isDarkMode,
  canPlayRanked,
  gamesUntilRanked,
  delay = 0.2
}: ProfileRankedProgressProps): React.ReactNode {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-2xl p-4 mb-4',
        isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
      )}
    >
      <h2 className={cn(
        'text-base font-bold mb-3 flex items-center gap-2',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        <Trophy className="text-yellow-500" />
        {t('ranked.title')}
      </h2>

      {canPlayRanked ? (
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-xl',
          isDarkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
        )}>
          <span className="text-2xl">🏆</span>
          <div>
            <p className={cn(
              'font-semibold',
              isDarkMode ? 'text-green-400' : 'text-green-700'
            )}>
              {t('ranked.unlocked')}
            </p>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              MMR: {profile?.ranked_mmr || 1000}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between mb-2">
            <span className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              {t('ranked.unlockProgress', { current: profile?.casual_games || 0, required: 10 })}
            </span>
            <span className={cn(
              'text-sm font-medium',
              isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
            )}>
              {gamesUntilRanked} to go
            </span>
          </div>
          <div className={cn(
            'h-3 rounded-full overflow-hidden',
            isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
          )}>
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(100, ((profile?.casual_games || 0) / 10) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default ProfileRankedProgress;

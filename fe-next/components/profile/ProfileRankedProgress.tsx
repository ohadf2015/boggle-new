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
      className="rounded-3xl p-6 mb-4 bg-slate-800/80 border-3 border-neo-pink shadow-hard-pink"
    >
      <h2 className="text-xl font-black font-neo-display uppercase mb-4 flex items-center gap-2 text-white">
        <Trophy className="text-neo-yellow" />
        {t('ranked.title')}
      </h2>

      {canPlayRanked ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-900/30 border-3 border-green-500/50">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="font-black text-green-400 uppercase">
              {t('ranked.unlocked')}
            </p>
            <p className="text-sm text-gray-400">
              MMR: <span className="font-black text-neo-cyan">{profile?.ranked_mmr || 1000}</span>
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">
              {t('ranked.unlockProgress', { current: profile?.casual_games || 0, required: 10 })}
            </span>
            <span className="text-sm font-black text-neo-pink">
              {gamesUntilRanked} {t('ranked.toGo')}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-black border-3 border-neo-black">
            <div
              className="h-full bg-gradient-to-r from-neo-pink to-neo-cyan transition-all duration-500"
              style={{ width: `${Math.min(100, ((profile?.casual_games || 0) / 10) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default ProfileRankedProgress;

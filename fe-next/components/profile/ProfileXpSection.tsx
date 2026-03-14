'use client';

import React from 'react';
import { motion } from 'framer-motion';
import LevelBadge from '@/components/LevelBadge';
import XpProgressBar, { getLevelFromXp } from '@/components/XpProgressBar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface ProfileXpSectionProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  compact?: boolean;
  delay?: number;
}

export function ProfileXpSection({
  profile,
  isDarkMode,
  compact = false,
  delay = 0.05
}: ProfileXpSectionProps): React.ReactNode {
  const { t } = useLanguage();
  const level = getLevelFromXp(profile?.total_xp || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-3xl mb-4 border-3 border-neo-cyan shadow-hard-cyan',
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
          <span className="text-neo-cyan">⚡</span>
          {t('xp.title')}
        </h2>
        <div className="bg-neo-yellow rounded-lg border-3 border-neo-black shadow-hard-sm px-3 py-1 rotate-2">
          <span className="text-sm font-black text-neo-black">
            {t('xp.level')} {level}
          </span>
        </div>
      </div>

      <XpProgressBar
        totalXp={profile?.total_xp || 0}
        showNumbers
      />

      {!compact && (
        <div className="mt-4 p-3 bg-black/40 rounded-xl border-3 border-neo-black flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {t('xp.totalXpEarned')}
          </span>
          <span className="text-lg font-black text-neo-cyan">
            {(profile?.total_xp || 0).toLocaleString()}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default ProfileXpSection;

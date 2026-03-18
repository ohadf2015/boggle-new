'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import XpProgressBar, { getLevelFromXp } from '@/components/XpProgressBar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';
import type { PrestigeReward } from '@/backend/modules/xpManager';

interface ProfileXpSectionProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  compact?: boolean;
  delay?: number;
  onProfileRefresh?: () => void;
}

export function ProfileXpSection({
  profile,
  isDarkMode: _isDarkMode,
  compact = false,
  delay = 0.05,
  onProfileRefresh,
}: ProfileXpSectionProps): React.ReactNode {
  const { t } = useLanguage();
  const level = getLevelFromXp(profile?.total_xp || 0);
  const [prestigeRewards, setPrestigeRewards] = useState<PrestigeReward[]>([]);

  const prestigeLevel = profile?.prestige_level || 0;
  const prestigeMultiplier = profile?.prestige_multiplier || 1.0;

  // Fetch prestige rewards preview when at max level
  useEffect(() => {
    if (level >= 100 && prestigeLevel < 5) {
      fetch('/api/engagement/prestige')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.nextPrestigeRewards) {
            setPrestigeRewards(data.nextPrestigeRewards);
          }
        })
        .catch(() => { /* silently fail — rewards preview is non-critical */ });
    }
  }, [level, prestigeLevel]);

  const handlePrestigeSuccess = useCallback(() => {
    onProfileRefresh?.();
  }, [onProfileRefresh]);

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
        prestigeLevel={prestigeLevel}
        prestigeMultiplier={prestigeMultiplier}
        nextPrestigeRewards={prestigeRewards}
        onPrestigeSuccess={handlePrestigeSuccess}
      />

      {!compact && (
        <div className="mt-4 p-3 bg-black/40 rounded-xl border-3 border-neo-black flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
            {t('xp.totalXpEarned')}
          </span>
          <span className="text-lg font-black text-neo-cyan">
            {(profile?.lifetime_xp || profile?.total_xp || 0).toLocaleString()}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default ProfileXpSection;

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
        'rounded-neo-xl mb-4 border border-white/[0.08]',
        compact ? 'p-4' : 'p-6',
        'bg-neo-navy-light'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn(
          'font-black font-neo-display uppercase flex items-center gap-2',
          compact ? 'text-lg' : 'text-xl',
          'text-white'
        )}>
          <span className="w-8 h-8 rounded-lg bg-neo-cyan/10 flex items-center justify-center text-neo-cyan text-sm">⚡</span>
          {t('xp.title')}
        </h2>
        <div className="bg-neo-cyan/10 rounded-xl px-3 py-1">
          <span className="text-sm font-black text-neo-cyan">
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
        <div className="mt-4 p-3 bg-white/[0.04] rounded-xl flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
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

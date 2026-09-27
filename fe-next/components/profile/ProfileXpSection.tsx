'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { Zap } from 'lucide-react';
import XpProgressBar, { getLevelFromXp } from '@/components/XpProgressBar';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
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

  useEffect(() => {
    if (level >= 100 && prestigeLevel < 5) {
      fetchWithAuth('/api/engagement/prestige')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.nextPrestigeRewards) {
            setPrestigeRewards(data.nextPrestigeRewards);
          }
        })
        .catch(() => { /* non-critical */ });
    }
  }, [level, prestigeLevel]);

  const handlePrestigeSuccess = useCallback(() => {
    onProfileRefresh?.();
  }, [onProfileRefresh]);

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'relative bg-neo-navy-light overflow-hidden mb-4',
        'border-3 border-neo-black rounded-neo shadow-hard-cyan',
        compact ? 'p-4' : 'p-5',
      )}
    >
      {/* Cyan halftone ribbon — top edge */}
      <div className="absolute top-0 inset-x-0 h-2.5 bg-neo-cyan">
        <div className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-overlay" aria-hidden />
      </div>

      <div className={cn('flex items-start justify-between gap-3', compact ? 'mt-2 mb-3' : 'mt-3 mb-4')}>
        <h2 className={cn(
          'font-black font-neo-display uppercase tracking-tight flex items-center gap-2.5 text-neo-white',
          compact ? 'text-lg' : 'text-2xl',
        )}>
          <span className={cn(
            'flex items-center justify-center bg-neo-cyan text-neo-black',
            'border-2 border-neo-black rounded-neo shadow-hard-sm',
            compact ? 'w-8 h-8' : 'w-10 h-10',
          )}>
            <Zap strokeWidth={2.75} className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          </span>
          {t('xp.title')}
        </h2>

        {/* Level plate — physical, hard-shadowed */}
        <div className={cn(
          'shrink-0 bg-neo-cyan text-neo-black',
          'border-2 border-neo-black rounded-neo shadow-hard-sm',
          'px-3 py-1.5 leading-none text-center',
        )}>
          <span className="block text-[9px] font-black uppercase tracking-[0.2em] opacity-70">
            {t('xp.level')}
          </span>
          <span className="block font-neo-display font-black text-2xl mt-0.5 tabular-nums">
            {level}
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
        <div className="mt-4 flex items-center justify-between gap-3 px-3 py-2.5 bg-neo-black/40 border-2 border-neo-black rounded-neo">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neo-white">
            {t('xp.totalXpEarned')}
          </span>
          <span className="font-neo-display font-black text-xl text-neo-cyan tabular-nums">
            {(profile?.lifetime_xp || profile?.total_xp || 0).toLocaleString()}
          </span>
        </div>
      )}
    </m.div>
  );
}

export default ProfileXpSection;

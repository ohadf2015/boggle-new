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
          <span className={compact ? 'text-xl' : 'text-2xl'}>⚡</span>
          {t('xp.title')}
        </h2>
        <LevelBadge
          level={getLevelFromXp(profile?.total_xp || 0)}
          size={compact ? 'md' : 'lg'}
          showLabel
        />
      </div>

      <XpProgressBar
        totalXp={profile?.total_xp || 0}
        showNumbers
      />

      {!compact && (profile?.current_level ?? 0) >= 5 && (
        <div className={cn(
          'mt-4 pt-4 border-t',
          isDarkMode ? 'border-slate-700' : 'border-gray-200'
        )}>
          <p className={cn(
            'text-sm font-medium',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            {t('xp.totalXpEarned')}: <span className={cn(
              'font-bold',
              isDarkMode ? 'text-neo-cyan' : 'text-neo-pink'
            )}>{(profile?.total_xp || 0).toLocaleString()}</span>
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default ProfileXpSection;

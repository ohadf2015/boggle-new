'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Star, Clock } from 'lucide-react';
import { StatCard } from './StatCard';
import { formatTimePlayed } from '@/constants/achievementIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface ProfileStatsGridProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  delay?: number;
}

export function ProfileStatsGrid({ profile, isDarkMode, delay = 0.1 }: ProfileStatsGridProps): React.ReactNode {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4"
    >
      <StatCard
        icon={<Gamepad2 />}
        label={t('profile.totalGames')}
        value={profile?.total_games || 0}
        isDarkMode={isDarkMode}
      />
      <StatCard
        icon={<Trophy />}
        label={t('profile.wins')}
        value={(profile?.ranked_wins || 0) + (profile?.casual_wins || 0)}
        isDarkMode={isDarkMode}
      />
      <StatCard
        icon={<Star />}
        label={t('profile.totalScore')}
        value={(profile?.total_score || 0).toLocaleString()}
        isDarkMode={isDarkMode}
        highlight
      />
      <StatCard
        icon={<span className="text-lg">📝</span>}
        label={t('profile.wordsFound')}
        value={profile?.total_words || 0}
        isDarkMode={isDarkMode}
      />
      <StatCard
        icon={<Clock />}
        label={t('profile.timePlayed')}
        value={formatTimePlayed(profile?.total_time_played)}
        isDarkMode={isDarkMode}
      />
    </motion.div>
  );
}

export default ProfileStatsGrid;

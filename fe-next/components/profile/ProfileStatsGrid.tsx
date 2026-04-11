'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Clock } from 'lucide-react';
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

  const totalScore = profile?.total_score || 0;
  const totalWins = (profile?.ranked_wins || 0) + (profile?.casual_wins || 0);
  const totalWords = profile?.total_words || 0;
  const totalTime = profile?.total_time_played || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
    >
      <StatCard
        icon={<Star />}
        label={t('profile.totalScore')}
        value={totalScore.toLocaleString()}
        isDarkMode={isDarkMode}
        color="cyan"
        progress={Math.min(100, (totalScore / 1000000) * 100)}
      />
      <StatCard
        icon={<Trophy />}
        label={t('profile.wins')}
        value={totalWins}
        isDarkMode={isDarkMode}
        color="pink"
        progress={Math.min(100, (totalWins / 500) * 100)}
      />
      <StatCard
        icon={<span className="text-lg">📝</span>}
        label={t('profile.wordsFound')}
        value={(totalWords).toLocaleString()}
        isDarkMode={isDarkMode}
        color="lime"
        progress={Math.min(100, (totalWords / 50000) * 100)}
      />
      <StatCard
        icon={<Clock />}
        label={t('profile.timePlayed')}
        value={formatTimePlayed(totalTime)}
        isDarkMode={isDarkMode}
        color="purple"
        progress={Math.min(100, (totalTime / 500) * 100)}
      />
    </motion.div>
  );
}

export default ProfileStatsGrid;

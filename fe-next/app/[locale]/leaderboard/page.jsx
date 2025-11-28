'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaMedal, FaArrowLeft } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getLeaderboard, getUserRank } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { user, profile, isSupabaseEnabled } = useAuth();
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!isSupabaseEnabled) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await getLeaderboard(100);
        if (fetchError) throw fetchError;
        setLeaderboard(data || []);

        // Fetch user's rank if authenticated
        if (user?.id) {
          const { data: rankData } = await getUserRank(user.id);
          if (rankData) {
            setUserRank(rankData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isSupabaseEnabled, user?.id]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
    }
  };

  if (!isSupabaseEnabled) {
    return (
      <div className={cn(
        'min-h-screen',
        isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <Header showLeaderboardLink={false} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <FaTrophy className="mx-auto text-6xl text-gray-400 mb-4" />
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {t('leaderboard.title')}
            </h2>
            <p className={cn(
              'text-lg',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              Coming soon! Leaderboard feature is being set up.
            </p>
            <Button
              onClick={() => router.push(`/${language}`)}
              className="mt-6"
            >
              <FaArrowLeft className="mr-2" />
              Back to Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-screen',
      isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    )}>
      <Header showLeaderboardLink={false} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className={cn(
            'text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}>
            <FaTrophy className="text-yellow-500" />
            {t('leaderboard.title')}
          </h1>
          <p className={cn(
            'mt-2',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            {t('leaderboard.allTime')}
          </p>
        </motion.div>

        {/* User's Rank Card (if authenticated) */}
        {profile && userRank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mb-6 p-4 rounded-xl border-2',
              isDarkMode
                ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/30'
                : 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: profile.avatar_color || '#4ECDC4' }}
                >
                  {profile.avatar_emoji || '🐶'}
                </span>
                <div>
                  <p className={cn(
                    'text-sm',
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    {t('leaderboard.yourRank')}
                  </p>
                  <p className={cn(
                    'text-2xl font-bold',
                    isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                  )}>
                    #{userRank.rank_position || '—'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-sm',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {t('leaderboard.score')}
                </p>
                <p className={cn(
                  'text-2xl font-bold',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  {userRank.total_score?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={cn(
            'text-center py-12 rounded-xl',
            isDarkMode ? 'bg-red-900/20' : 'bg-red-50'
          )}>
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              'rounded-xl overflow-hidden',
              isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
            )}
          >
            {/* Table Header */}
            <div className={cn(
              'grid grid-cols-12 gap-4 px-4 py-3 text-sm font-semibold',
              isDarkMode ? 'bg-slate-700/50 text-gray-300' : 'bg-gray-50 text-gray-600'
            )}>
              <div className="col-span-1 text-center">{t('leaderboard.rank')}</div>
              <div className="col-span-5">{t('leaderboard.player')}</div>
              <div className="col-span-3 text-right">{t('leaderboard.score')}</div>
              <div className="col-span-3 text-right">{t('leaderboard.games')}</div>
            </div>

            {/* Table Body */}
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <FaMedal className={cn(
                  'mx-auto text-4xl mb-4',
                  isDarkMode ? 'text-gray-600' : 'text-gray-300'
                )} />
                <p className={cn(
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {t('leaderboard.noRankYet')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = user?.id === entry.player_id;

                  return (
                    <motion.div
                      key={entry.player_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'grid grid-cols-12 gap-4 px-4 py-3 items-center transition-colors',
                        isCurrentUser
                          ? isDarkMode
                            ? 'bg-cyan-900/20'
                            : 'bg-cyan-50'
                          : isDarkMode
                            ? 'hover:bg-slate-700/30'
                            : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="col-span-1 text-center">
                        {getRankIcon(rank)}
                      </div>
                      <div className="col-span-5 flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{ backgroundColor: entry.avatar_color || '#4ECDC4' }}
                        >
                          {entry.avatar_emoji || '🐶'}
                        </span>
                        <span className={cn(
                          'font-medium truncate',
                          isCurrentUser
                            ? isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                            : isDarkMode ? 'text-white' : 'text-gray-900'
                        )}>
                          {entry.username}
                        </span>
                      </div>
                      <div className={cn(
                        'col-span-3 text-right font-semibold',
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      )}>
                        {entry.total_score?.toLocaleString() || 0}
                      </div>
                      <div className={cn(
                        'col-span-3 text-right',
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      )}>
                        {entry.games_played || 0}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => router.push(`/${language}`)}
            className={cn(
              'rounded-full',
              isDarkMode
                ? 'border-slate-600 text-gray-300 hover:bg-slate-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            )}
          >
            <FaArrowLeft className="mr-2" />
            Back to Game
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AutoHideHeader from '@/components/AutoHideHeader';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard, useUserRank } from '@/hooks/useSupabaseRealtime';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';

interface LeaderboardEntry {
  player_id: string;
  display_name?: string;
  username?: string;
  avatar_emoji?: string;
  avatar_color?: string;
  avatar_image?: string;
  profile_picture_url?: string;
  total_score?: number;
  games_played?: number;
}

export default function LeaderboardPage(): React.ReactNode {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { user, profile, isSupabaseEnabled } = useAuth();
  const router = useRouter();
  const isLandscape = useMobileLandscape();
  const isDarkMode = theme === 'dark';

  // Use real-time hooks for live leaderboard updates
  const {
    data: leaderboard,
    loading,
    error,
    subscriptionStatus,
    refetch
  } = useLeaderboard({ limit: 100, enabled: isSupabaseEnabled });

  const { rank: userRank } = useUserRank(user?.id);

  const getRankIcon = (rank: number): React.ReactNode => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  if (!isSupabaseEnabled) {
    return (
      <div className={cn(
        'flex flex-col min-h-full',
        isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Trophy className="mx-auto text-6xl text-gray-600 mb-4" />
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {t('leaderboard.title')}
            </h2>
            <p className={cn(
              'text-lg',
              isDarkMode ? 'text-gray-600' : 'text-gray-600'
            )}>
              Coming soon! Leaderboard feature is being set up.
            </p>
            <Button
              onClick={() => router.push(`/${language}`)}
              className="mt-6"
            >
              <ArrowLeft className="me-2 rtl:rotate-180" />
              Back to Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col min-h-full',
      isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    )}>
      <AutoHideHeader />

      <div className={cn(
        "flex-1 max-w-4xl mx-auto px-4 w-full",
        isLandscape ? "py-2" : "py-8"
      )}>
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
            <Trophy className="text-yellow-500" />
            {t('leaderboard.title')}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <p className={cn(
              isDarkMode ? 'text-gray-600' : 'text-gray-600'
            )}>
              {t('leaderboard.allTime')}
            </p>
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'w-2 h-2 rounded-full animate-pulse',
                subscriptionStatus === 'SUBSCRIBED' ? 'bg-green-500' : 'bg-yellow-500'
              )} />
              <span className={cn(
                'text-xs',
                isDarkMode ? 'text-gray-600' : 'text-gray-600'
              )}>
                {subscriptionStatus === 'SUBSCRIBED' ? 'Live' : 'Connecting...'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              className={cn(
                'h-7 w-7 p-0 rounded-full',
                isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              )}
              title="Refresh"
            >
              <RefreshCw className={cn(
                'w-3 h-3',
                loading && 'animate-spin',
                isDarkMode ? 'text-gray-600' : 'text-gray-600'
              )} />
            </Button>
          </div>
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
                <Avatar
                  profilePictureUrl={profile.profile_picture_url ?? undefined}
                  avatarImage={profile.avatar_image ?? undefined}
                  avatarEmoji={profile.avatar_emoji ?? undefined}
                  avatarColor={profile.avatar_color ?? undefined}
                  size="lg"
                />
                <div>
                  <p className={cn(
                    'text-sm',
                    isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
                  isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
                <Medal className={cn(
                  'mx-auto text-4xl mb-4',
                  isDarkMode ? 'text-gray-600' : 'text-gray-300'
                )} />
                <p className={cn(
                  isDarkMode ? 'text-gray-600' : 'text-gray-600'
                )}>
                  {t('leaderboard.noRankYet')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {leaderboard.map((entry: LeaderboardEntry, index: number) => {
                  const rank = index + 1;
                  const isCurrentUser = user?.id === entry.player_id;

                  return (
                    <div
                      key={entry.player_id}
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
                        <Avatar
                          profilePictureUrl={entry.profile_picture_url ?? undefined}
                          avatarImage={entry.avatar_image ?? undefined}
                          avatarEmoji={entry.avatar_emoji ?? undefined}
                          avatarColor={entry.avatar_color ?? undefined}
                          size="md"
                        />
                        <span className={cn(
                          'font-medium truncate',
                          isCurrentUser
                            ? isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                            : isDarkMode ? 'text-white' : 'text-gray-900'
                        )}>
                          {entry.display_name || entry.username}
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
                        isDarkMode ? 'text-gray-600' : 'text-gray-600'
                      )}>
                        {entry.games_played || 0}
                      </div>
                    </div>
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
            <ArrowLeft className="me-2 rtl:rotate-180" />
            Back to Game
          </Button>
        </div>
      </div>
    </div>
  );
}

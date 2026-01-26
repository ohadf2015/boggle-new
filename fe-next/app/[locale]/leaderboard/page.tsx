'use client';

// Force dynamic rendering to ensure fresh leaderboard data
export const dynamic = 'force-dynamic';

import React from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Trophy, Medal, ArrowLeft, RefreshCw } from 'lucide-react';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageStateHandler } from '@/components/layout/PageStateHandler';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard, useUserRank } from '@/hooks/useSupabaseRealtime';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import NearRankIndicator from '@/components/leaderboard/NearRankIndicator';

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
    refetch,
  } = useLeaderboard({ limit: 100, enabled: isSupabaseEnabled });

  const { rank: userRank } = useUserRank(user?.id);

  const handleRefresh = async () => {
    refetch();
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success(t('common.refreshed') || 'Refreshed', {
      duration: 2000,
    });
  };

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

  // Supabase not enabled - show coming soon
  if (!isSupabaseEnabled) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <Trophy className="mx-auto text-6xl text-gray-600 mb-4" />
          <h2 className={cn('text-2xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-gray-900')}>
            {t('leaderboard.title')}
          </h2>
          <p className={cn('text-lg', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
            Coming soon! Leaderboard feature is being set up.
          </p>
          <Button
            onClick={() => router.push(`/${language}`)}
            className="mt-6 bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg"
          >
            <ArrowLeft className="me-2 rtl:rotate-180" />
            {t('common.backToMenu')}
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout onRefresh={handleRefresh} padding="md" maxWidth="4xl">
      <div className={cn(isLandscape ? 'py-2' : 'py-4')}>
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1
            className={cn(
              'text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}
          >
            <Trophy className="text-yellow-500" />
            {t('leaderboard.title')}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <p className={cn(isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
              {t('leaderboard.allTime')}
            </p>
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-2 h-2 rounded-full animate-pulse',
                  subscriptionStatus === 'SUBSCRIBED' ? 'bg-green-500' : 'bg-yellow-500'
                )}
              />
              <span className={cn('text-xs', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
                {subscriptionStatus === 'SUBSCRIBED'
                  ? t('leaderboard.live') || 'Live'
                  : t('common.connecting') || 'Connecting...'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className={cn(
                'h-7 w-7 p-0 rounded-full',
                isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              )}
              title="Refresh"
            >
              {loading ? (
                <NeoLoader variant="dots" size="sm" />
              ) : (
                <RefreshCw
                  className={cn(
                    'w-3 h-3',
                    isDarkMode ? 'text-gray-600' : 'text-gray-600'
                  )}
                />
              )}
            </Button>
          </div>
        </motion.div>

        {/* User's Rank Card (if authenticated) */}
        {profile && userRank && (
          <div className="space-y-4 mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'p-4 rounded-xl border-2',
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
                    size="lg"
                  />
                  <div>
                    <p className={cn('text-sm', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
                      {t('leaderboard.yourRank')}
                    </p>
                    <p className={cn('text-2xl font-bold', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}>
                      #{userRank.rank_position || '—'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
                    {t('leaderboard.score')}
                  </p>
                  <p className={cn('text-2xl font-bold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                    {userRank.total_score?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Near-Rank Progress Indicator */}
            <NearRankIndicator
              leaderboard={leaderboard}
              userRank={userRank}
              userId={user?.id}
              totalPlayers={leaderboard.length}
              nearbyRange={100}
            />
          </div>
        )}

        {/* Content with loading/error states */}
        <PageStateHandler
          isLoading={loading}
          error={error?.toString()}
          onRetry={refetch}
          isEmpty={!loading && !error && leaderboard.length === 0}
          emptyIcon={<Medal className={cn('mx-auto text-4xl mb-4', isDarkMode ? 'text-gray-600' : 'text-gray-300')} />}
          emptyText={t('leaderboard.noRankYet')}
        >
          {/* Leaderboard Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              'rounded-xl overflow-hidden',
              isDarkMode
                ? 'bg-slate-800/50 border border-slate-700'
                : 'bg-white border border-gray-200 shadow-lg'
            )}
          >
            {/* Table Header */}
            <div
              className={cn(
                'grid grid-cols-10 gap-3 px-3 py-2 text-sm font-semibold',
                isDarkMode ? 'bg-slate-700/50 text-gray-300' : 'bg-gray-50 text-gray-600'
              )}
            >
              <div className="col-span-1 text-center">{t('leaderboard.rank')}</div>
              <div className="col-span-5">{t('leaderboard.player')}</div>
              <div className="col-span-2 text-right">{t('leaderboard.score')}</div>
              <div className="col-span-2 text-right">{t('leaderboard.games')}</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {leaderboard.map((entry: LeaderboardEntry, index: number) => {
                const rank = index + 1;
                const isCurrentUser = user?.id === entry.player_id;

                return (
                  <div
                    key={entry.player_id}
                    className={cn(
                      'grid grid-cols-10 gap-3 px-3 py-2 items-center transition-colors',
                      isCurrentUser
                        ? isDarkMode
                          ? 'bg-cyan-900/20'
                          : 'bg-cyan-50'
                        : isDarkMode
                          ? 'hover:bg-slate-700/30'
                          : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="col-span-1 text-center">{getRankIcon(rank)}</div>
                    <div className="col-span-5 flex items-center gap-2">
                      <Avatar
                        profilePictureUrl={entry.profile_picture_url ?? undefined}
                        avatarImage={entry.avatar_image ?? undefined}
                        size="sm"
                      />
                      <span
                        className={cn(
                          'font-medium truncate text-sm',
                          isCurrentUser
                            ? isDarkMode
                              ? 'text-cyan-400'
                              : 'text-cyan-600'
                            : isDarkMode
                              ? 'text-white'
                              : 'text-gray-900'
                        )}
                      >
                        {entry.display_name || entry.username}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'col-span-2 text-right font-semibold text-sm',
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {entry.total_score?.toLocaleString() || 0}
                    </div>
                    <div className={cn('col-span-2 text-right text-sm', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
                      {entry.games_played || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </PageStateHandler>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => router.push(`/${language}`)}
            className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg rounded-neo"
          >
            <ArrowLeft className="me-2 rtl:rotate-180" />
            {t('common.backToMenu')}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FaUsers, FaGamepad, FaClock, FaGlobe, FaChartLine,
  FaArrowLeft, FaSync, FaUserPlus, FaLanguage, FaLink,
  FaTrophy, FaCalendarDay, FaCalendarWeek, FaServer
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Country code to flag emoji and name mapping
const COUNTRY_INFO: Record<string, { flag: string; name: string }> = {
  'US': { flag: '🇺🇸', name: 'United States' },
  'IL': { flag: '🇮🇱', name: 'Israel' },
  'GB': { flag: '🇬🇧', name: 'United Kingdom' },
  'DE': { flag: '🇩🇪', name: 'Germany' },
  'FR': { flag: '🇫🇷', name: 'France' },
  'CA': { flag: '🇨🇦', name: 'Canada' },
  'AU': { flag: '🇦🇺', name: 'Australia' },
  'SE': { flag: '🇸🇪', name: 'Sweden' },
  'JP': { flag: '🇯🇵', name: 'Japan' },
  'BR': { flag: '🇧🇷', name: 'Brazil' },
  'IN': { flag: '🇮🇳', name: 'India' },
  'NL': { flag: '🇳🇱', name: 'Netherlands' },
  'ES': { flag: '🇪🇸', name: 'Spain' },
  'IT': { flag: '🇮🇹', name: 'Italy' },
  'RU': { flag: '🇷🇺', name: 'Russia' },
  'PL': { flag: '🇵🇱', name: 'Poland' },
  'MX': { flag: '🇲🇽', name: 'Mexico' },
  'KR': { flag: '🇰🇷', name: 'South Korea' },
  'Unknown': { flag: '🌍', name: 'Unknown' },
};

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'he': 'Hebrew',
  'sv': 'Swedish',
  'ja': 'Japanese',
};

interface Stats {
  overview: {
    totalPlayers: number;
    totalGames: number;
    totalGameTimeHours: number;
    totalWords: number;
  };
  activity: {
    gamesToday: number;
    uniquePlayersToday: number;
    uniquePlayersWeek: number;
    uniquePlayersMonth: number;
    signupsToday: number;
    signupsWeek: number;
  };
  languages: Record<string, number>;
}

interface RealtimeStats {
  activeRooms: number;
  playersOnline: number;
  gamesInProgress: number;
  socketConnections: number;
  timestamp: number;
}

interface CountryData {
  country: string;
  count: number;
}

interface SourceData {
  sources: { name: string; count: number }[];
  mediums: { name: string; count: number }[];
  campaigns: { name: string; count: number }[];
  referrers: { name: string; count: number }[];
}

interface DailyActivity {
  date: string;
  games: number;
  uniquePlayers: number;
  signups: number;
}

interface TopPlayer {
  id: string;
  username: string;
  display_name?: string;
  avatar_emoji?: string;
  avatar_color?: string;
  total_score: number;
  total_games: number;
  total_words: number;
  total_time_played: number;
  current_level?: number;
  created_at: string;
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  const [stats, setStats] = useState<Stats | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [sources, setSources] = useState<SourceData | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'sources' | 'activity'>('overview');

  // Get auth token for API calls
  const getAuthToken = useCallback(async () => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  // Fetch all admin data
  const fetchAdminData = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // Fetch all data in parallel
      const [statsRes, realtimeRes, countriesRes, sourcesRes, dailyRes, playersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/realtime', { headers }),
        fetch('/api/admin/players/countries', { headers }),
        fetch('/api/admin/players/sources', { headers }),
        fetch('/api/admin/activity/daily?days=30', { headers }),
        fetch('/api/admin/players/top?limit=20', { headers }),
      ]);

      if (!statsRes.ok) {
        const error = await statsRes.json();
        throw new Error(error.error || 'Failed to fetch stats');
      }

      const [statsData, realtimeData, countriesData, sourcesData, dailyData, playersData] = await Promise.all([
        statsRes.json(),
        realtimeRes.json(),
        countriesRes.json(),
        sourcesRes.json(),
        dailyRes.json(),
        playersRes.json(),
      ]);

      setStats(statsData);
      setRealtimeStats(realtimeData);
      setCountries(countriesData.countries || []);
      setSources(sourcesData);
      setDailyActivity(dailyData.daily || []);
      setTopPlayers(playersData.players || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load dashboard data');
    }
  }, [getAuthToken]);

  // Initial load and refresh
  useEffect(() => {
    if (!authLoading && isAdmin) {
      setLoading(true);
      fetchAdminData().finally(() => setLoading(false));
    }
  }, [authLoading, isAdmin, fetchAdminData]);

  // Refresh realtime stats every 10 seconds
  useEffect(() => {
    if (!isAdmin) return;

    const interval = setInterval(async () => {
      const token = await getAuthToken();
      if (!token) return;

      try {
        const res = await fetch('/api/admin/realtime', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRealtimeStats(data);
        }
      } catch (error) {
        console.error('Failed to refresh realtime stats:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isAdmin, getAuthToken]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAdminData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // Not authenticated or not admin
  if (!authLoading && (!user || !isAdmin)) {
    return (
      <div className={cn(
        'min-h-screen',
        isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className={cn(
              'text-2xl font-bold mb-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              Admin Access Required
            </h2>
            <p className={cn(
              'text-lg mb-6',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              You don't have permission to access this page.
            </p>
            <Button
              onClick={() => router.push(`/${language}`)}
              className={cn(
                'rounded-full px-6',
                isDarkMode
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400'
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

  // Loading state
  if (authLoading || loading) {
    return (
      <div className={cn(
        'min-h-screen',
        isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      )}>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-screen pb-8',
      isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    )}>
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={cn(
              'text-2xl sm:text-3xl font-bold',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              Admin Dashboard
            </h1>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              Welcome, {profile?.display_name || profile?.username}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className={cn(
                'rounded-lg',
                isDarkMode ? 'border-slate-600 text-gray-300' : ''
              )}
            >
              <FaSync className={cn('mr-2', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              onClick={() => router.push(`/${language}`)}
              variant="outline"
              size="sm"
              className={cn(
                'rounded-lg',
                isDarkMode ? 'border-slate-600 text-gray-300' : ''
              )}
            >
              <FaArrowLeft className="mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Realtime Stats Bar */}
        {realtimeStats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-xl p-4 mb-6 border',
              isDarkMode
                ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30'
                : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className={cn(
                'text-sm font-medium',
                isDarkMode ? 'text-green-400' : 'text-green-700'
              )}>
                Live Stats
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <RealtimeStat icon={<FaServer />} label="Socket Connections" value={realtimeStats.socketConnections} isDarkMode={isDarkMode} />
              <RealtimeStat icon={<FaGamepad />} label="Active Rooms" value={realtimeStats.activeRooms} isDarkMode={isDarkMode} />
              <RealtimeStat icon={<FaUsers />} label="Players Online" value={realtimeStats.playersOnline} isDarkMode={isDarkMode} />
              <RealtimeStat icon={<FaTrophy />} label="Games In Progress" value={realtimeStats.gamesInProgress} isDarkMode={isDarkMode} />
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['overview', 'players', 'sources', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors',
                activeTab === tab
                  ? isDarkMode
                    ? 'bg-cyan-600 text-white'
                    : 'bg-cyan-500 text-white'
                  : isDarkMode
                    ? 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              )}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'players' && 'Players'}
              {tab === 'sources' && 'Traffic Sources'}
              {tab === 'activity' && 'Activity'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={<FaUsers />}
                label="Total Players"
                value={stats.overview.totalPlayers.toLocaleString()}
                isDarkMode={isDarkMode}
                color="cyan"
              />
              <StatCard
                icon={<FaGamepad />}
                label="Total Games"
                value={stats.overview.totalGames.toLocaleString()}
                isDarkMode={isDarkMode}
                color="purple"
              />
              <StatCard
                icon={<FaClock />}
                label="Total Play Time"
                value={`${stats.overview.totalGameTimeHours}h`}
                isDarkMode={isDarkMode}
                color="orange"
              />
              <StatCard
                icon={<FaChartLine />}
                label="Words Found"
                value={stats.overview.totalWords.toLocaleString()}
                isDarkMode={isDarkMode}
                color="green"
              />
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <SmallStatCard
                icon={<FaCalendarDay />}
                label="Games Today"
                value={stats.activity.gamesToday}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<FaUsers />}
                label="Players Today"
                value={stats.activity.uniquePlayersToday}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<FaCalendarWeek />}
                label="Players This Week"
                value={stats.activity.uniquePlayersWeek}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<FaUsers />}
                label="Players This Month"
                value={stats.activity.uniquePlayersMonth}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<FaUserPlus />}
                label="Signups Today"
                value={stats.activity.signupsToday}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<FaUserPlus />}
                label="Signups This Week"
                value={stats.activity.signupsWeek}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Languages & Countries Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Languages */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  'rounded-xl p-6 border',
                  isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200 shadow-md'
                )}
              >
                <h3 className={cn(
                  'text-lg font-bold mb-4 flex items-center gap-2',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  <FaLanguage className="text-cyan-500" />
                  Games by Language
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.languages)
                    .sort((a, b) => b[1] - a[1])
                    .map(([lang, count]) => {
                      const total = Object.values(stats.languages).reduce((a, b) => a + b, 0);
                      const percentage = Math.round((count / total) * 100);
                      return (
                        <div key={lang}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                              {LANGUAGE_NAMES[lang] || lang}
                            </span>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              {count.toLocaleString()} ({percentage}%)
                            </span>
                          </div>
                          <div className={cn(
                            'h-2 rounded-full overflow-hidden',
                            isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                          )}>
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>

              {/* Countries */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  'rounded-xl p-6 border',
                  isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200 shadow-md'
                )}
              >
                <h3 className={cn(
                  'text-lg font-bold mb-4 flex items-center gap-2',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  <FaGlobe className="text-green-500" />
                  Players by Country
                </h3>
                {countries.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {countries.slice(0, 10).map((item) => {
                      const info = COUNTRY_INFO[item.country] || { flag: '🌍', name: item.country };
                      const total = countries.reduce((a, b) => a + b.count, 0);
                      const percentage = Math.round((item.count / total) * 100);
                      return (
                        <div
                          key={item.country}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg',
                            isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{info.flag}</span>
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                              {info.name}
                            </span>
                          </div>
                          <span className={cn(
                            'font-medium',
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          )}>
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={cn(
                    'text-center py-4',
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    No country data available yet
                  </p>
                )}
              </motion.div>
            </div>
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-xl p-6 border',
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200 shadow-md'
            )}
          >
            <h3 className={cn(
              'text-lg font-bold mb-4 flex items-center gap-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              <FaTrophy className="text-yellow-500" />
              Top Players
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn(
                    'text-left border-b',
                    isDarkMode ? 'border-slate-700' : 'border-gray-200'
                  )}>
                    <th className={cn('pb-2 pr-4', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>#</th>
                    <th className={cn('pb-2 pr-4', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Player</th>
                    <th className={cn('pb-2 pr-4 text-right', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Score</th>
                    <th className={cn('pb-2 pr-4 text-right hidden sm:table-cell', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Games</th>
                    <th className={cn('pb-2 pr-4 text-right hidden md:table-cell', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Words</th>
                    <th className={cn('pb-2 text-right hidden lg:table-cell', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((player, index) => (
                    <tr
                      key={player.id}
                      className={cn(
                        'border-b last:border-0',
                        isDarkMode ? 'border-slate-700' : 'border-gray-100'
                      )}
                    >
                      <td className={cn('py-3 pr-4', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                        {index + 1}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                            style={{ backgroundColor: player.avatar_color || '#6366f1' }}
                          >
                            {player.avatar_emoji || '😀'}
                          </div>
                          <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                            {player.display_name || player.username}
                          </span>
                        </div>
                      </td>
                      <td className={cn('py-3 pr-4 text-right font-medium', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}>
                        {player.total_score.toLocaleString()}
                      </td>
                      <td className={cn('py-3 pr-4 text-right hidden sm:table-cell', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                        {player.total_games}
                      </td>
                      <td className={cn('py-3 pr-4 text-right hidden md:table-cell', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                        {player.total_words?.toLocaleString() || 0}
                      </td>
                      <td className={cn('py-3 text-right hidden lg:table-cell', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                        {formatTime(player.total_time_played || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Traffic Sources Tab */}
        {activeTab === 'sources' && sources && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* UTM Sources */}
            <SourceCard
              title="UTM Sources"
              icon={<FaLink />}
              data={sources.sources}
              isDarkMode={isDarkMode}
            />
            {/* UTM Mediums */}
            <SourceCard
              title="UTM Mediums"
              icon={<FaLink />}
              data={sources.mediums}
              isDarkMode={isDarkMode}
            />
            {/* Campaigns */}
            <SourceCard
              title="Campaigns"
              icon={<FaChartLine />}
              data={sources.campaigns}
              isDarkMode={isDarkMode}
            />
            {/* Referrers */}
            <SourceCard
              title="Referrer Domains"
              icon={<FaGlobe />}
              data={sources.referrers}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && dailyActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-xl p-6 border',
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200 shadow-md'
            )}
          >
            <h3 className={cn(
              'text-lg font-bold mb-4 flex items-center gap-2',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              <FaChartLine className="text-blue-500" />
              Daily Activity (Last 30 Days)
            </h3>

            {/* Simple bar chart */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dailyActivity.slice().reverse().map((day) => {
                const maxGames = Math.max(...dailyActivity.map(d => d.games), 1);
                const gameWidth = (day.games / maxGames) * 100;

                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className={cn(
                      'w-24 text-sm',
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1">
                      <div className={cn(
                        'h-6 rounded overflow-hidden',
                        isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                      )}>
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(gameWidth, 5)}%` }}
                        >
                          {day.games > 0 && (
                            <span className="text-xs text-white font-medium">{day.games}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      'w-20 text-sm text-right',
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    )}>
                      {day.uniquePlayers} players
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className={cn(
              'mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm',
              isDarkMode ? 'border-slate-700' : 'border-gray-200'
            )}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-cyan-500 to-blue-500" />
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Games played</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, isDarkMode, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isDarkMode: boolean;
  color: 'cyan' | 'purple' | 'orange' | 'green';
}) {
  const colorClasses = {
    cyan: isDarkMode
      ? 'from-cyan-900/40 to-blue-900/40 border-cyan-500/30'
      : 'from-cyan-50 to-blue-50 border-cyan-200',
    purple: isDarkMode
      ? 'from-purple-900/40 to-pink-900/40 border-purple-500/30'
      : 'from-purple-50 to-pink-50 border-purple-200',
    orange: isDarkMode
      ? 'from-orange-900/40 to-amber-900/40 border-orange-500/30'
      : 'from-orange-50 to-amber-50 border-orange-200',
    green: isDarkMode
      ? 'from-green-900/40 to-emerald-900/40 border-green-500/30'
      : 'from-green-50 to-emerald-50 border-green-200',
  };

  const iconColorClasses = {
    cyan: isDarkMode ? 'text-cyan-400' : 'text-cyan-600',
    purple: isDarkMode ? 'text-purple-400' : 'text-purple-600',
    orange: isDarkMode ? 'text-orange-400' : 'text-orange-600',
    green: isDarkMode ? 'text-green-400' : 'text-green-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl p-4 sm:p-6 bg-gradient-to-br border',
        colorClasses[color]
      )}
    >
      <div className={cn('text-2xl sm:text-3xl mb-2', iconColorClasses[color])}>
        {icon}
      </div>
      <p className={cn(
        'text-2xl sm:text-3xl font-bold',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        {value}
      </p>
      <p className={cn(
        'text-xs sm:text-sm',
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      )}>
        {label}
      </p>
    </motion.div>
  );
}

function SmallStatCard({ icon, label, value, isDarkMode }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isDarkMode: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl p-4 border',
      isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200 shadow-sm'
    )}>
      <div className={cn('text-lg mb-1', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
        {icon}
      </div>
      <p className={cn(
        'text-xl font-bold',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        {value.toLocaleString()}
      </p>
      <p className={cn(
        'text-xs',
        isDarkMode ? 'text-gray-500' : 'text-gray-500'
      )}>
        {label}
      </p>
    </div>
  );
}

function RealtimeStat({ icon, label, value, isDarkMode }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isDarkMode: boolean;
}) {
  return (
    <div className="text-center">
      <div className={cn('text-sm mb-1', isDarkMode ? 'text-green-400' : 'text-green-600')}>
        {icon}
      </div>
      <p className={cn(
        'text-xl font-bold',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        {value}
      </p>
      <p className={cn(
        'text-xs',
        isDarkMode ? 'text-gray-500' : 'text-gray-500'
      )}>
        {label}
      </p>
    </div>
  );
}

function SourceCard({ title, icon, data, isDarkMode }: {
  title: string;
  icon: React.ReactNode;
  data: { name: string; count: number }[];
  isDarkMode: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl p-6 border',
        isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200 shadow-md'
      )}
    >
      <h3 className={cn(
        'text-lg font-bold mb-4 flex items-center gap-2',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        <span className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}>{icon}</span>
        {title}
      </h3>
      {data.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.slice(0, 10).map((item) => {
            const total = data.reduce((a, b) => a + b.count, 0);
            const percentage = Math.round((item.count / total) * 100);
            return (
              <div
                key={item.name}
                className={cn(
                  'flex items-center justify-between p-2 rounded-lg',
                  isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'
                )}
              >
                <span className={cn(
                  'truncate flex-1 mr-2',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                )}>
                  {item.name}
                </span>
                <span className={cn(
                  'font-medium whitespace-nowrap',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                )}>
                  {item.count} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={cn(
          'text-center py-4',
          isDarkMode ? 'text-gray-500' : 'text-gray-400'
        )}>
          No data available yet
        </p>
      )}
    </motion.div>
  );
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

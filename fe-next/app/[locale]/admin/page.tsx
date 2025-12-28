'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Gamepad2, Clock, Globe, TrendingUp,
  ArrowLeft, RefreshCw, UserPlus, Languages, Link,
  Trophy, CalendarDays, CalendarRange, Server, User, Bot,
  Book, Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { DailyWordSchedule } from '@/components/admin/DailyWordSchedule';

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
  singlePlayerCount: number;
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

interface BotWord {
  word: string;
  language: string;
  likes: number;
  dislikes: number;
  netScore: number;
  isAutoBlacklisted: boolean;
}

interface CommunityWord {
  word: string;
  language: string;
  likes_count: number;
  dislikes_count: number;
  net_score: number;
  is_potentially_valid: boolean;
  first_submitter: string | null;
  last_voted_at: string | null;
  created_at: string;
  status: 'validated' | 'pending_review' | 'rejected' | 'pending';
}

interface CommunityWordsStats {
  total: number;
  validated: number;
  pendingReview: number;
  rejected: number;
  pending: number;
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
  const [botWords, setBotWords] = useState<BotWord[]>([]);
  const [communityWords, setCommunityWords] = useState<CommunityWord[]>([]);
  const [communityWordsStats, setCommunityWordsStats] = useState<CommunityWordsStats | null>(null);
  const [communityWordsTotal, setCommunityWordsTotal] = useState(0);
  const [communityWordSearch, setCommunityWordSearch] = useState('');
  const [communityWordStatus, setCommunityWordStatus] = useState<string>('pending_review');
  const [communityWordLanguage, setCommunityWordLanguage] = useState<string>('all');
  const [communityWordLoading, setCommunityWordLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'sources' | 'activity' | 'bot-words' | 'community-words'>('overview');

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
      const [statsRes, realtimeRes, countriesRes, sourcesRes, dailyRes, playersRes, botWordsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/realtime', { headers }),
        fetch('/api/admin/players/countries', { headers }),
        fetch('/api/admin/players/sources', { headers }),
        fetch('/api/admin/activity/daily?days=30', { headers }),
        fetch('/api/admin/players/top?limit=20', { headers }),
        fetch('/api/admin/bot-words', { headers }),
      ]);

      if (!statsRes.ok) {
        const error = await statsRes.json();
        throw new Error(error.error || 'Failed to fetch stats');
      }

      const [statsData, realtimeData, countriesData, sourcesData, dailyData, playersData, botWordsData] = await Promise.all([
        statsRes.json(),
        realtimeRes.json(),
        countriesRes.json(),
        sourcesRes.json(),
        dailyRes.json(),
        playersRes.json(),
        botWordsRes.json(),
      ]);

      setStats(statsData);
      setRealtimeStats(realtimeData);
      setCountries(countriesData.countries || []);
      setSources(sourcesData);
      setDailyActivity(dailyData.daily || []);
      setTopPlayers(playersData.players || []);
      setBotWords(botWordsData.words || []);
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

  // Handle bot word approval
  const handleApprove = async (word: BotWord) => {
    const token = await getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const res = await fetch('/api/admin/bot-words/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word: word.word, language: word.language })
      });

      if (res.ok) {
        toast.success(`Approved: ${word.word}`);
        fetchAdminData(); // Refresh data
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to approve word');
      }
    } catch (error) {
      console.error('Failed to approve word:', error);
      toast.error('Failed to approve word');
    }
  };

  // Handle bot word disapproval
  const handleDisapprove = async (word: BotWord) => {
    const token = await getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const res = await fetch('/api/admin/bot-words/disapprove', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          word: word.word,
          language: word.language,
          reason: 'Admin review: invalid word'
        })
      });

      if (res.ok) {
        toast.success(`Disapproved: ${word.word}`);
        fetchAdminData(); // Refresh data
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to disapprove word');
      }
    } catch (error) {
      console.error('Failed to disapprove word:', error);
      toast.error('Failed to disapprove word');
    }
  };

  // Fetch community words with filters
  const fetchCommunityWords = useCallback(async (search?: string, status?: string, lang?: string) => {
    const token = await getAuthToken();
    if (!token) return;

    setCommunityWordLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      if (lang && lang !== 'all') params.set('language', lang);
      params.set('sortBy', 'net_score');
      params.set('sortOrder', 'desc');
      params.set('limit', '100');

      const res = await fetch(`/api/admin/community-words?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCommunityWords(data.words || []);
        setCommunityWordsStats(data.stats || null);
        setCommunityWordsTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch community words:', error);
    } finally {
      setCommunityWordLoading(false);
    }
  }, [getAuthToken]);

  // Handle community word approval
  const handleCommunityApprove = async (word: CommunityWord, addToDictionary: boolean = false) => {
    const token = await getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const res = await fetch('/api/admin/community-words/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          word: word.word,
          language: word.language,
          addToDictionary
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Approved "${word.word}" (+${data.votesAdded} votes)`);
        fetchCommunityWords(communityWordSearch, communityWordStatus, communityWordLanguage);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to approve word');
      }
    } catch (error) {
      console.error('Failed to approve word:', error);
      toast.error('Failed to approve word');
    }
  };

  // Handle community word disapproval
  const handleCommunityDisapprove = async (word: CommunityWord, addToBlacklist: boolean = false) => {
    const token = await getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      const res = await fetch('/api/admin/community-words/disapprove', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          word: word.word,
          language: word.language,
          reason: 'Admin review: invalid word',
          addToBlacklist
        })
      });

      if (res.ok) {
        toast.success(`Disapproved "${word.word}"`);
        fetchCommunityWords(communityWordSearch, communityWordStatus, communityWordLanguage);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to disapprove word');
      }
    } catch (error) {
      console.error('Failed to disapprove word:', error);
      toast.error('Failed to disapprove word');
    }
  };

  // Fetch community words when tab changes or filters update
  useEffect(() => {
    if (activeTab === 'community-words' && isAdmin) {
      fetchCommunityWords(communityWordSearch, communityWordStatus, communityWordLanguage);
    }
  }, [activeTab, isAdmin, communityWordStatus, communityWordLanguage, fetchCommunityWords, communityWordSearch]);

  // Still loading profile - wait before showing access denied
  // This prevents showing "Access Required" while profile is still being fetched
  const isProfileLoading = !authLoading && user && !profile;

  // Not authenticated or not admin (but only check after profile has loaded)
  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
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
              isDarkMode ? 'text-gray-600' : 'text-gray-600'
            )}>
              You don&apos;t have permission to access this page.
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
              <ArrowLeft className="mr-2" />
              Back to Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state - includes profile loading
  if (authLoading || loading || isProfileLoading) {
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
              isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
              <RefreshCw className={cn('mr-2', refreshing && 'animate-spin')} />
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
              <ArrowLeft className="mr-2" />
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <RealtimeStat icon={<Server />} label="Socket Connections" value={realtimeStats.socketConnections} isDarkMode={isDarkMode} />
              <RealtimeStat icon={<Gamepad2 />} label="Active Rooms" value={realtimeStats.activeRooms} isDarkMode={isDarkMode} />
              <RealtimeStat icon={<Users />} label="Players Online" value={realtimeStats.playersOnline} isDarkMode={isDarkMode} />
              <RealtimeStat icon={<User />} label="Single Players" value={realtimeStats.singlePlayerCount} isDarkMode={isDarkMode} />
              <RealtimeStat icon={<Trophy />} label="Games In Progress" value={realtimeStats.gamesInProgress} isDarkMode={isDarkMode} />
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['overview', 'players', 'sources', 'activity', 'community-words', 'bot-words'] as const).map((tab) => (
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
                    ? 'bg-slate-800 text-gray-600 hover:bg-slate-700'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              )}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'players' && 'Players'}
              {tab === 'sources' && 'Traffic Sources'}
              {tab === 'activity' && 'Activity'}
              {tab === 'community-words' && 'Community Words'}
              {tab === 'bot-words' && 'Bot Words'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={<Users />}
                label="Total Players"
                value={stats.overview.totalPlayers.toLocaleString()}
                isDarkMode={isDarkMode}
                color="cyan"
              />
              <StatCard
                icon={<Gamepad2 />}
                label="Total Games"
                value={stats.overview.totalGames.toLocaleString()}
                isDarkMode={isDarkMode}
                color="purple"
              />
              <StatCard
                icon={<Clock />}
                label="Total Play Time"
                value={`${stats.overview.totalGameTimeHours}h`}
                isDarkMode={isDarkMode}
                color="orange"
              />
              <StatCard
                icon={<TrendingUp />}
                label="Words Found"
                value={stats.overview.totalWords.toLocaleString()}
                isDarkMode={isDarkMode}
                color="green"
              />
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <SmallStatCard
                icon={<CalendarDays />}
                label="Games Today"
                value={stats.activity.gamesToday}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<Users />}
                label="Players Today"
                value={stats.activity.uniquePlayersToday}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<CalendarRange />}
                label="Players This Week"
                value={stats.activity.uniquePlayersWeek}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<Users />}
                label="Players This Month"
                value={stats.activity.uniquePlayersMonth}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<UserPlus />}
                label="Signups Today"
                value={stats.activity.signupsToday}
                isDarkMode={isDarkMode}
              />
              <SmallStatCard
                icon={<UserPlus />}
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
                  <Languages className="text-cyan-500" />
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
                            <span className={isDarkMode ? 'text-gray-600' : 'text-gray-600'}>
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
                  <Globe className="text-green-500" />
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
                            isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
                    isDarkMode ? 'text-gray-600' : 'text-gray-600'
                  )}>
                    No country data available yet
                  </p>
                )}
              </motion.div>
            </div>

            {/* Admin Tools Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className={cn(
                'text-lg font-bold mb-4 flex items-center gap-2',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}>
                <Settings className="text-cyan-500" />
                Admin Tools
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Daily Word Manager */}
                <motion.button
                  onClick={() => router.push(`/${language}/admin/words`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'rounded-xl p-6 border text-left transition-all',
                    isDarkMode
                      ? 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30 hover:border-purple-400'
                      : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:border-purple-300 shadow-md'
                  )}
                >
                  <div className={cn('text-3xl mb-3', isDarkMode ? 'text-purple-400' : 'text-purple-600')}>
                    <Book />
                  </div>
                  <h4 className={cn(
                    'text-lg font-bold mb-2',
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  )}>
                    Daily Word Manager
                  </h4>
                  <p className={cn(
                    'text-sm',
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    Manage target words for daily Word Hunt challenges across all languages
                  </p>
                </motion.button>

                {/* Placeholder for future tools */}
                <div className={cn(
                  'rounded-xl p-6 border opacity-50',
                  isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'
                )}>
                  <div className={cn('text-3xl mb-3', isDarkMode ? 'text-gray-600' : 'text-gray-400')}>
                    <Settings />
                  </div>
                  <h4 className={cn(
                    'text-lg font-bold mb-2',
                    isDarkMode ? 'text-gray-500' : 'text-gray-500'
                  )}>
                    More tools coming soon
                  </h4>
                  <p className={cn(
                    'text-sm',
                    isDarkMode ? 'text-gray-600' : 'text-gray-500'
                  )}>
                    Additional admin features will be added here
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Daily Word Schedule - AI-Selected Words */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <DailyWordSchedule />
            </motion.div>
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
              <Trophy className="text-yellow-500" />
              Top Players
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn(
                    'text-left border-b',
                    isDarkMode ? 'border-slate-700' : 'border-gray-200'
                  )}>
                    <th className={cn('pb-2 pr-4', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>#</th>
                    <th className={cn('pb-2 pr-4', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>Player</th>
                    <th className={cn('pb-2 pr-4 text-right', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>Score</th>
                    <th className={cn('pb-2 pr-4 text-right hidden sm:table-cell', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>Games</th>
                    <th className={cn('pb-2 pr-4 text-right hidden md:table-cell', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>Words</th>
                    <th className={cn('pb-2 text-right hidden lg:table-cell', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>Time</th>
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
                      <td className={cn('py-3 pr-4', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
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
                      <td className={cn('py-3 pr-4 text-right hidden sm:table-cell', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
                        {player.total_games}
                      </td>
                      <td className={cn('py-3 pr-4 text-right hidden md:table-cell', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
                        {player.total_words?.toLocaleString() || 0}
                      </td>
                      <td className={cn('py-3 text-right hidden lg:table-cell', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
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
              icon={<Link />}
              data={sources.sources}
              isDarkMode={isDarkMode}
            />
            {/* UTM Mediums */}
            <SourceCard
              title="UTM Mediums"
              icon={<Link />}
              data={sources.mediums}
              isDarkMode={isDarkMode}
            />
            {/* Campaigns */}
            <SourceCard
              title="Campaigns"
              icon={<TrendingUp />}
              data={sources.campaigns}
              isDarkMode={isDarkMode}
            />
            {/* Referrers */}
            <SourceCard
              title="Referrer Domains"
              icon={<Globe />}
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
              <TrendingUp className="text-blue-500" />
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
                      isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
                      isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
                <span className={isDarkMode ? 'text-gray-600' : 'text-gray-600'}>Games played</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Community Words Tab */}
        {activeTab === 'community-words' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-xl p-6 border',
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200 shadow-md'
            )}
          >
            {/* Header with Stats */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className={cn(
                  'text-lg font-bold flex items-center gap-2',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  <Globe className="text-cyan-500" />
                  Community Words Moderation
                </h3>
                {communityWordsStats && (
                  <div className="flex flex-wrap gap-3 mt-2 text-sm">
                    <span className={cn(
                      'px-2 py-1 rounded',
                      isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                    )}>
                      {communityWordsStats.validated} Validated
                    </span>
                    <span className={cn(
                      'px-2 py-1 rounded',
                      isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {communityWordsStats.pendingReview} Pending Review
                    </span>
                    <span className={cn(
                      'px-2 py-1 rounded',
                      isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                    )}>
                      {communityWordsStats.pending} New
                    </span>
                    <span className={cn(
                      'px-2 py-1 rounded',
                      isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                    )}>
                      {communityWordsStats.rejected} Rejected
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search words..."
                  value={communityWordSearch}
                  onChange={(e) => setCommunityWordSearch(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border',
                    isDarkMode
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  )}
                />
              </div>

              {/* Status Filter */}
              <select
                value={communityWordStatus}
                onChange={(e) => setCommunityWordStatus(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-lg border',
                  isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                )}
              >
                <option value="all">All Status</option>
                <option value="pending_review">Pending Review (3-9)</option>
                <option value="validated">Validated (10+)</option>
                <option value="pending">New (0-2)</option>
                <option value="rejected">Rejected (negative)</option>
              </select>

              {/* Language Filter */}
              <select
                value={communityWordLanguage}
                onChange={(e) => setCommunityWordLanguage(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-lg border',
                  isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                )}
              >
                <option value="all">All Languages</option>
                <option value="en">English</option>
                <option value="he">Hebrew</option>
                <option value="sv">Swedish</option>
                <option value="es">Spanish</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            {/* Results Count */}
            <div className={cn(
              'text-sm mb-4',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              Showing {communityWords.length} of {communityWordsTotal} words
            </div>

            {/* Loading State */}
            {communityWordLoading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Words Table */}
            {!communityWordLoading && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={cn(
                      'text-left border-b',
                      isDarkMode ? 'border-slate-700' : 'border-gray-200'
                    )}>
                      <th className={cn('pb-2 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Word</th>
                      <th className={cn('pb-2 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Language</th>
                      <th className={cn('pb-2 px-2 text-right', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Likes</th>
                      <th className={cn('pb-2 px-2 text-right', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Dislikes</th>
                      <th className={cn('pb-2 px-2 text-right', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Net Score</th>
                      <th className={cn('pb-2 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Status</th>
                      <th className={cn('pb-2 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communityWords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={cn(
                          'py-8 text-center',
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        )}>
                          No words found matching your filters
                        </td>
                      </tr>
                    ) : (
                      communityWords.map((word) => (
                        <tr key={`${word.word}-${word.language}`} className={cn(
                          'border-b',
                          isDarkMode ? 'border-slate-700' : 'border-gray-200'
                        )}>
                          <td className={cn('py-3 px-2 font-mono font-medium', isDarkMode ? 'text-white' : 'text-gray-900')}>
                            {word.word}
                          </td>
                          <td className={cn('py-3 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                            {LANGUAGE_NAMES[word.language] || word.language}
                          </td>
                          <td className="py-3 px-2 text-right text-green-400">{word.likes_count}</td>
                          <td className="py-3 px-2 text-right text-red-400">{word.dislikes_count}</td>
                          <td className={cn(
                            'py-3 px-2 text-right font-bold',
                            word.net_score >= 10 ? 'text-green-400' :
                            word.net_score < 0 ? 'text-red-400' :
                            word.net_score >= 3 ? 'text-yellow-400' : 'text-gray-400'
                          )}>
                            {word.net_score}
                          </td>
                          <td className="py-3 px-2">
                            {word.status === 'validated' && (
                              <span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400">
                                Validated
                              </span>
                            )}
                            {word.status === 'pending_review' && (
                              <span className="px-2 py-1 rounded text-xs bg-yellow-900/30 text-yellow-400">
                                Review
                              </span>
                            )}
                            {word.status === 'pending' && (
                              <span className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-400">
                                New
                              </span>
                            )}
                            {word.status === 'rejected' && (
                              <span className="px-2 py-1 rounded text-xs bg-red-900/30 text-red-400">
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCommunityApprove(word, false)}
                                className="px-3 py-1 text-xs border border-green-600 text-green-400 rounded hover:bg-green-600/20 transition-colors"
                                title="Approve (add votes to validate)"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleCommunityApprove(word, true)}
                                className="px-3 py-1 text-xs border border-blue-600 text-blue-400 rounded hover:bg-blue-600/20 transition-colors"
                                title="Approve and add to permanent dictionary"
                              >
                                + Dict
                              </button>
                              <button
                                onClick={() => handleCommunityDisapprove(word, false)}
                                className="px-3 py-1 text-xs border border-red-600 text-red-400 rounded hover:bg-red-600/20 transition-colors"
                                title="Disapprove (add negative votes)"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleCommunityDisapprove(word, true)}
                                className="px-3 py-1 text-xs border border-red-800 text-red-600 rounded hover:bg-red-800/20 transition-colors"
                                title="Reject and blacklist"
                              >
                                Ban
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Help Text */}
            <div className={cn(
              'mt-4 pt-4 border-t text-sm',
              isDarkMode ? 'border-slate-700 text-gray-500' : 'border-gray-200 text-gray-500'
            )}>
              <p className="mb-2"><strong>Status Levels:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><span className="text-green-400">Validated (10+)</span>: Word is automatically accepted in games</li>
                <li><span className="text-yellow-400">Pending Review (3-9)</span>: Word needs more community votes or admin action</li>
                <li><span className="text-gray-400">New (0-2)</span>: Recently submitted word</li>
                <li><span className="text-red-400">Rejected (negative)</span>: Word has more dislikes than likes</li>
              </ul>
              <p className="mt-3"><strong>Actions:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><span className="text-green-400">Approve</span>: Add votes to push word toward validation threshold</li>
                <li><span className="text-blue-400">+ Dict</span>: Approve and add to permanent dictionary file</li>
                <li><span className="text-red-400">Reject</span>: Add negative votes</li>
                <li><span className="text-red-600">Ban</span>: Reject and add to blacklist (prevents future use)</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Bot Words Tab */}
        {activeTab === 'bot-words' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-xl p-6 border',
              isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200 shadow-md'
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn(
                'text-lg font-bold flex items-center gap-2',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}>
                <Bot className="text-purple-500" />
                Bot Words Review
              </h3>

              {/* Language Filter */}
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className={cn(
                  'px-3 py-1 rounded-lg border',
                  isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                )}
              >
                <option value="all">All Languages</option>
                <option value="en">English</option>
                <option value="he">Hebrew</option>
                <option value="sv">Swedish</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            {/* Words Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={cn(
                    'text-left border-b',
                    isDarkMode ? 'border-slate-700' : 'border-gray-200'
                  )}>
                    <th className={cn('pb-2 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Word</th>
                    <th className={cn('pb-2 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Language</th>
                    <th className={cn('pb-2 px-2 text-right', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Likes</th>
                    <th className={cn('pb-2 px-2 text-right', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Dislikes</th>
                    <th className={cn('pb-2 px-2 text-right', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Net Score</th>
                    <th className={cn('pb-2 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Status</th>
                    <th className={cn('pb-2 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {botWords
                    .filter(w => selectedLanguage === 'all' || w.language === selectedLanguage)
                    .map((word) => (
                      <tr key={`${word.word}-${word.language}`} className={cn(
                        'border-b',
                        isDarkMode ? 'border-slate-700' : 'border-gray-200'
                      )}>
                        <td className={cn('py-3 px-2 font-mono', isDarkMode ? 'text-white' : 'text-gray-900')}>{word.word}</td>
                        <td className={cn('py-3 px-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>{LANGUAGE_NAMES[word.language] || word.language}</td>
                        <td className="py-3 px-2 text-right text-green-400">{word.likes}</td>
                        <td className="py-3 px-2 text-right text-red-400">{word.dislikes}</td>
                        <td className={cn('py-3 px-2 text-right font-bold', word.netScore < 0 ? 'text-red-400' : 'text-gray-400')}>{word.netScore}</td>
                        <td className="py-3 px-2">
                          {word.isAutoBlacklisted ? (
                            <span className="px-2 py-1 rounded text-xs bg-red-900/30 text-red-400">
                              Auto-Blacklisted
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-yellow-900/30 text-yellow-400">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(word)}
                              className="px-3 py-1 text-xs border border-green-600 text-green-400 rounded hover:bg-green-600/20 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDisapprove(word)}
                              className="px-3 py-1 text-xs border border-red-600 text-red-400 rounded hover:bg-red-600/20 transition-colors"
                            >
                              Disapprove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
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
        isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
      <div className={cn('text-lg mb-1', isDarkMode ? 'text-gray-600' : 'text-gray-600')}>
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
        isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
        isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
                  isDarkMode ? 'text-gray-600' : 'text-gray-600'
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
          isDarkMode ? 'text-gray-600' : 'text-gray-600'
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

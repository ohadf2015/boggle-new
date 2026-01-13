'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Calendar,
  Gamepad2,
  Trophy,
  Clock,
  ArrowUpDown,
  Filter,
  User,
  Crown,
  Target,
  Brain,
  Puzzle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// Types for unified game data
interface GameProfile {
  username: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
}

interface UnifiedGame {
  id: string;
  player_id: string | null;
  guest_session_id: string | null;
  game_code: string;
  score: number;
  word_count: number;
  longest_word: string | null;
  placement: number | null;
  is_ranked: boolean;
  is_guest: boolean;
  mode: string;
  language: string;
  time_played: number;
  created_at: string;
  profiles: GameProfile | null;
  drill_type?: string;
  drill_level?: number;
}

interface GamesResponse {
  success: boolean;
  games: UnifiedGame[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  breakdown: {
    authenticatedGames: number;
    guestGames: number;
    wordHuntGames: number;
    dailyChallengeGames: number;
    drillGames: number;
  };
}

interface TodayGamesHistoryProps {
  authToken: string;
}

type GameTypeFilter = 'all' | 'multiplayer' | 'word_hunt' | 'daily_challenge' | 'drill';
type SortField = 'created_at' | 'score' | 'word_count' | 'time_played';
type SortOrder = 'asc' | 'desc';

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  sv: '🇸🇪',
  ja: '🇯🇵',
  es: '🇪🇸',
};

const GAME_TYPE_ICONS: Record<string, React.ReactNode> = {
  ranked: <Trophy className="w-4 h-4 text-neo-lime" />,
  casual: <Gamepad2 className="w-4 h-4 text-blue-400" />,
  word_hunt: <Target className="w-4 h-4 text-green-400" />,
  daily_challenge: <Puzzle className="w-4 h-4 text-purple-400" />,
  drill: <Brain className="w-4 h-4 text-amber-400" />,
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function TodayGamesHistory({ authToken }: TodayGamesHistoryProps) {
  const { t, language: uiLanguage } = useLanguage();
  const isRTL = uiLanguage === 'he';

  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Filters
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all');
  const [rankedFilter, setRankedFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchTodayGames = useCallback(async () => {
    try {
      const todayDate = getTodayDateString();
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        startDate: todayDate,
        endDate: todayDate,
        sortBy: sortField,
        sortOrder: sortOrder,
      });

      if (languageFilter !== 'all') {
        params.set('language', languageFilter);
      }
      if (rankedFilter !== 'all') {
        params.set('isRanked', rankedFilter);
      }

      const response = await fetch(`/api/admin/game-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [authToken, page, sortField, sortOrder, languageFilter, rankedFilter]);

  // Fetch on mount and when filters change
  useEffect(() => {
    setLoading(true);
    fetchTodayGames();
  }, [fetchTodayGames]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodayGames();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTodayGames]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchTodayGames();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Filter games by type client-side (API doesn't have gameType filter)
  const filteredGames = useMemo(() => {
    if (!data?.games) return [];
    if (gameTypeFilter === 'all') return data.games;

    return data.games.filter(game => {
      switch (gameTypeFilter) {
        case 'multiplayer':
          return game.mode === 'ranked' || game.mode === 'casual';
        case 'word_hunt':
          return game.mode === 'word_hunt';
        case 'daily_challenge':
          return game.mode === 'daily_challenge';
        case 'drill':
          return game.mode === 'drill';
        default:
          return true;
      }
    });
  }, [data?.games, gameTypeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!data?.breakdown) {
      return { total: 0, multiplayer: 0, wordHunt: 0, daily: 0, drills: 0 };
    }
    const b = data.breakdown;
    return {
      total: b.authenticatedGames + b.guestGames + b.wordHuntGames + b.dailyChallengeGames + b.drillGames,
      multiplayer: b.authenticatedGames + b.guestGames,
      wordHunt: b.wordHuntGames,
      daily: b.dailyChallengeGames,
      drills: b.drillGames,
    };
  }, [data?.breakdown]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <NeoLoader variant="letters" size="md" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12 bg-slate-800/30 rounded-neo border-neo border-black">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={handleManualRefresh} variant="outline">
          {t('admin.todayGames.retry') || 'Retry'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-neo-lime" />
          <h2 className="text-xl font-neo-display text-neo-white">
            {t('admin.todayGames.title') || "Today's Games"}
          </h2>
        </div>
        <Button
          onClick={handleManualRefresh}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
        >
          {loading ? (
            <NeoLoader variant="dots" size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t('admin.todayGames.refresh') || 'Refresh'}
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          label={t('admin.todayGames.totalGames') || 'Total'}
          value={stats.total}
          icon={<Gamepad2 className="w-5 h-5 text-neo-lime" />}
        />
        <StatCard
          label={t('admin.todayGames.multiplayer') || 'Multiplayer'}
          value={stats.multiplayer}
          icon={<Trophy className="w-5 h-5 text-blue-400" />}
        />
        <StatCard
          label={t('admin.todayGames.wordHunt') || 'Word Hunt'}
          value={stats.wordHunt}
          icon={<Target className="w-5 h-5 text-green-400" />}
        />
        <StatCard
          label={t('admin.todayGames.daily') || 'Daily'}
          value={stats.daily}
          icon={<Puzzle className="w-5 h-5 text-purple-400" />}
        />
        <StatCard
          label={t('admin.todayGames.drills') || 'Drills'}
          value={stats.drills}
          icon={<Brain className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-slate-800/50 rounded-neo border-neo border-black p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">{t('admin.todayGames.filters') || 'Filters'}:</span>
        </div>

        <select
          value={languageFilter}
          onChange={(e) => { setLanguageFilter(e.target.value); setPage(1); }}
          className="bg-slate-700 text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
        >
          <option value="all">{t('admin.todayGames.allLanguages') || 'All Languages'}</option>
          <option value="en">🇺🇸 English</option>
          <option value="he">🇮🇱 Hebrew</option>
          <option value="sv">🇸🇪 Swedish</option>
          <option value="ja">🇯🇵 Japanese</option>
          <option value="es">🇪🇸 Spanish</option>
        </select>

        <select
          value={gameTypeFilter}
          onChange={(e) => { setGameTypeFilter(e.target.value as GameTypeFilter); setPage(1); }}
          className="bg-slate-700 text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
        >
          <option value="all">{t('admin.todayGames.allTypes') || 'All Types'}</option>
          <option value="multiplayer">{t('admin.todayGames.multiplayer') || 'Multiplayer'}</option>
          <option value="word_hunt">{t('admin.todayGames.wordHunt') || 'Word Hunt'}</option>
          <option value="daily_challenge">{t('admin.todayGames.daily') || 'Daily Challenge'}</option>
          <option value="drill">{t('admin.todayGames.drills') || 'Drills'}</option>
        </select>

        <select
          value={rankedFilter}
          onChange={(e) => { setRankedFilter(e.target.value); setPage(1); }}
          className="bg-slate-700 text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
        >
          <option value="all">{t('admin.todayGames.allModes') || 'All Modes'}</option>
          <option value="true">{t('admin.todayGames.rankedOnly') || 'Ranked Only'}</option>
          <option value="false">{t('admin.todayGames.casualOnly') || 'Casual Only'}</option>
        </select>
      </div>

      {/* Games Table */}
      {filteredGames.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <>
          <div className="bg-slate-800/50 rounded-neo border-neo border-black overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-700/50">
                <tr>
                  <SortableHeader
                    label={t('admin.todayGames.time') || 'Time'}
                    field="created_at"
                    currentField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    isRTL={isRTL}
                  />
                  <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                    {t('admin.todayGames.player') || 'Player'}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                    {t('admin.todayGames.type') || 'Type'}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                    {t('admin.todayGames.language') || 'Lang'}
                  </th>
                  <SortableHeader
                    label={t('admin.todayGames.score') || 'Score'}
                    field="score"
                    currentField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    isRTL={isRTL}
                  />
                  <SortableHeader
                    label={t('admin.todayGames.words') || 'Words'}
                    field="word_count"
                    currentField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    isRTL={isRTL}
                  />
                  <SortableHeader
                    label={t('admin.todayGames.duration') || 'Duration'}
                    field="time_played"
                    currentField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    isRTL={isRTL}
                  />
                  <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                    {t('admin.todayGames.code') || 'Code'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <AnimatePresence mode="popLayout">
                  {filteredGames.map((game) => (
                    <GameRow key={game.id} game={game} t={t} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {t('admin.todayGames.showing') || 'Showing'} {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, data.pagination.totalCount)} {t('admin.todayGames.of') || 'of'} {data.pagination.totalCount}
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(p => p - 1)}
                  disabled={!data.pagination.hasPrevPage}
                  variant="outline"
                  size="sm"
                >
                  {t('common.previous') || 'Previous'}
                </Button>
                <Button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.pagination.hasNextPage}
                  variant="outline"
                  size="sm"
                >
                  {t('common.next') || 'Next'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-slate-500">
        {t('admin.todayGames.lastUpdated') || 'Last updated'}: {new Date(lastRefresh).toLocaleTimeString()}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 rounded-neo border-neo border-black p-3 flex items-center gap-3">
      {icon}
      <div>
        <div className="text-xl font-neo-display text-neo-white">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

// Sortable Header Component
function SortableHeader({
  label,
  field,
  currentField,
  sortOrder,
  onSort,
  isRTL,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  isRTL: boolean;
}) {
  const isActive = currentField === field;

  return (
    <th
      className="px-4 py-3 text-left text-sm font-neo-display text-slate-300 cursor-pointer hover:text-neo-white transition-colors"
      onClick={() => onSort(field)}
    >
      <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
        {label}
        <ArrowUpDown className={cn(
          'w-3 h-3',
          isActive ? 'text-neo-lime' : 'text-slate-500'
        )} />
        {isActive && (
          <span className="text-xs text-neo-lime">
            {sortOrder === 'desc' ? '↓' : '↑'}
          </span>
        )}
      </div>
    </th>
  );
}

// Game Row Component
function GameRow({ game, t }: { game: UnifiedGame; t: (key: string) => string }) {
  const flag = LANGUAGE_FLAGS[game.language] || '🌐';
  const typeIcon = GAME_TYPE_ICONS[game.mode] || <Gamepad2 className="w-4 h-4 text-slate-400" />;

  const getTypeLabel = () => {
    switch (game.mode) {
      case 'ranked': return t('admin.todayGames.ranked') || 'Ranked';
      case 'casual': return t('admin.todayGames.casual') || 'Casual';
      case 'word_hunt': return t('admin.todayGames.wordHunt') || 'Word Hunt';
      case 'daily_challenge': return t('admin.todayGames.daily') || 'Daily';
      case 'drill': return `${game.drill_type || 'Drill'} L${game.drill_level || 1}`;
      default: return game.mode;
    }
  };

  const playerName = game.profiles?.display_name || game.profiles?.username ||
    (game.is_guest ? (t('admin.todayGames.guest') || 'Guest') : 'Unknown');

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="hover:bg-slate-700/30 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-300">{formatTime(game.created_at)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {game.is_guest ? (
            <User className="w-4 h-4 text-slate-400" />
          ) : game.placement === 1 ? (
            <Crown className="w-4 h-4 text-neo-lime" />
          ) : (
            <PlayerAvatar
              emoji={game.profiles?.avatar_emoji}
              color={game.profiles?.avatar_color}
            />
          )}
          <span className="text-sm text-neo-white truncate max-w-[120px]">
            {playerName}
          </span>
          {game.is_guest && (
            <span className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">
              {t('admin.todayGames.guest') || 'Guest'}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {typeIcon}
          <span className="text-sm text-slate-300">{getTypeLabel()}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-lg">{flag}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-neo-white">{game.score}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-slate-300">{game.word_count}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-300">{formatDuration(game.time_played)}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-400">{game.game_code}</span>
      </td>
    </motion.tr>
  );
}

// Player Avatar Component
function PlayerAvatar({ emoji, color }: { emoji?: string | null; color?: string | null }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
      style={{ backgroundColor: color || '#374151' }}
    >
      {emoji || '👤'}
    </div>
  );
}

// Empty State Component
function EmptyState({ t }: { t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 bg-slate-800/30 rounded-neo border-neo border-black"
    >
      <Calendar className="w-16 h-16 text-slate-500 mb-4" />
      <h3 className="text-xl font-neo-display text-slate-400 mb-2">
        {t('admin.todayGames.noGames') || 'No games today yet'}
      </h3>
      <p className="text-slate-500">
        {t('admin.todayGames.noGamesHint') || 'Games will appear here as players start playing'}
      </p>
    </motion.div>
  );
}

export default TodayGamesHistory;

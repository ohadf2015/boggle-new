'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Users, Gamepad2, Wifi, Clock, Crown, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { NeoLoader } from '@/components/ui/NeoLoader';

// Types matching backend DetailedGame and DetailedGamePlayer
interface LivePlayer {
  username: string;
  avatar: { emoji?: string; color?: string; avatarImage?: string } | null;
  isHost: boolean;
  isBot: boolean;
  presence: 'active' | 'idle' | 'afk' | 'disconnected';
  score: number;
  isAuthenticated: boolean;
}

interface LiveGame {
  gameCode: string;
  roomName: string;
  language: string;
  gameState: 'waiting' | 'in-progress' | 'validating' | 'finished';
  isRanked: boolean;
  createdAt: number;
  timerSeconds: number;
  players: LivePlayer[];
}

interface LiveGamesResponse {
  games: LiveGame[];
  stats: {
    activeGames: number;
    playersInGames: number;
    socketConnections: number;
    singlePlayerCount: number;
  };
  timestamp: number;
}

interface LiveMonitorProps {
  authToken: string;
  /** Callback to refresh token when it expires (401 error) */
  onTokenExpired?: () => Promise<string | null>;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  sv: '🇸🇪',
  ja: '🇯🇵',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
};

const STATE_COLORS: Record<string, string> = {
  waiting: 'bg-yellow-500',
  'in-progress': 'bg-green-500',
  validating: 'bg-blue-500',
  finished: 'bg-gray-500',
};

const PRESENCE_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  afk: 'bg-orange-500',
  disconnected: 'bg-red-500',
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatTimeLeft(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function LiveMonitor({ authToken, onTokenExpired }: LiveMonitorProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<LiveGamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [currentToken, setCurrentToken] = useState(authToken);

  // Update current token when prop changes (after refresh)
  useEffect(() => {
    setCurrentToken(authToken);
  }, [authToken]);

  const fetchLiveGames = useCallback(async (retryCount = 0): Promise<void> => {
    try {
      const response = await fetch('/api/admin/live-games', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      // Handle 401 (token expired) - attempt refresh and retry once
      if (response.status === 401 && retryCount === 0 && onTokenExpired) {
        console.log('[LiveMonitor] Token expired, refreshing...');
        const newToken = await onTokenExpired();

        if (newToken) {
          setCurrentToken(newToken);
          // Retry request with new token
          return fetchLiveGames(1);
        }

        throw new Error('Authentication failed - unable to refresh token');
      }

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
  }, [currentToken, onTokenExpired]);

  // Initial fetch and auto-refresh every 5 seconds
  useEffect(() => {
    fetchLiveGames();
    const interval = setInterval(fetchLiveGames, 5000);
    return () => clearInterval(interval);
  }, [fetchLiveGames]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchLiveGames();
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <NeoLoader variant="mascot-letters" size="md" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={handleManualRefresh} variant="outline">
          {t('admin.live.retry') || 'Retry'}
        </Button>
      </div>
    );
  }

  const { games = [], stats } = data || { games: [], stats: { activeGames: 0, playersInGames: 0, socketConnections: 0, singlePlayerCount: 0 } };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/50 rounded-neo border-neo border-black p-4 shadow-hard">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Live Indicator */}
          <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="font-neo-display text-green-400">{t('admin.live.live') || 'Live'}</span>
            </div>
            
            {/* Mobile Refresh Button (shown only on mobile) */}
            <Button
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              className="gap-2 sm:hidden h-8"
              disabled={loading}
            >
              {loading ? (
                <NeoLoader variant="dots" size="sm" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {t('admin.live.refresh') || 'Refresh'}
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-2 text-slate-300">
            <div className="flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span className="text-sm">{stats.activeGames} <span className="text-slate-500">{t('admin.live.games') || 'games'}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm">{stats.playersInGames} <span className="text-slate-500">{t('admin.live.players') || 'players'}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-sm">{stats.socketConnections} <span className="text-slate-500">{t('admin.live.sockets') || 'sockets'}</span></span>
            </div>
            {stats.singlePlayerCount > 0 && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" />
                <span className="text-sm">{stats.singlePlayerCount} <span className="text-slate-500">{t('admin.live.singlePlayer') || 'solo'}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Refresh Button */}
        <Button
          onClick={handleManualRefresh}
          variant="outline"
          size="sm"
          className="gap-2 hidden sm:flex"
          disabled={loading}
        >
          {loading ? (
            <NeoLoader variant="dots" size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t('admin.live.refresh') || 'Refresh'}
        </Button>
      </div>

      {/* Games Grid or Empty State */}
      {games.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 bg-slate-800/30 rounded-neo border-neo border-black"
        >
          <Gamepad2 className="w-16 h-16 text-slate-500 mb-4" />
          <h3 className="text-xl font-neo-display text-slate-400 mb-2">
            {t('admin.live.noGames') || 'No active games'}
          </h3>
          <p className="text-slate-500">
            {t('admin.live.noGamesHint') || 'Games will appear here when players start playing'}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Active Games Section */}
          <div>
            <h2 className="text-lg font-neo-display text-neo-white mb-4">
              {t('admin.live.activeGames') || 'Active Games'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {games.map((game) => (
                  <GameCard key={game.gameCode} game={game} t={t} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* All Connected Players Table */}
          <div>
            <h2 className="text-lg font-neo-display text-neo-white mb-4">
              {t('admin.live.connectedPlayers') || 'Connected Players'}
            </h2>
            <div className="bg-slate-800/50 rounded-neo border-neo border-black overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                      {t('admin.live.player') || 'Player'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                      {t('admin.live.game') || 'Game'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                      {t('admin.live.status') || 'Status'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                      {t('admin.live.score') || 'Score'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                      {t('admin.live.type') || 'Type'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {games.flatMap((game) =>
                    game.players.map((player) => (
                      <PlayerRow
                        key={`${game.gameCode}-${player.username}`}
                        player={player}
                        gameCode={game.gameCode}
                        language={game.language}
                        t={t}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-slate-500">
        {t('admin.live.lastUpdated') || 'Last updated'}: {new Date(lastRefresh).toLocaleTimeString()}
      </div>
    </div>
  );
}

// Game Card Component
function GameCard({ game, t }: { game: LiveGame; t: (key: string) => string }) {
  const flag = LANGUAGE_FLAGS[game.language] || '🌐';
  const stateColor = STATE_COLORS[game.gameState] || 'bg-gray-500';
  const stateLabel = game.gameState.replace('-', ' ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-slate-800/50 rounded-neo border-neo border-black p-4 shadow-hard hover:translate-y-[-2px] transition-transform"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{flag}</span>
          <span className="font-mono font-bold text-neo-white">{game.gameCode}</span>
        </div>
        <div className="flex items-center gap-2">
          {game.isRanked && (
            <span className="px-2 py-0.5 text-xs bg-neo-lime text-black rounded font-bold">
              {t('admin.live.ranked') || 'Ranked'}
            </span>
          )}
          <span className={cn('px-2 py-0.5 text-xs rounded font-bold text-white capitalize', stateColor)}>
            {stateLabel}
          </span>
        </div>
      </div>

      {/* Players */}
      <div className="space-y-2 mb-3 border-t border-b border-slate-700 py-3">
        {game.players.map((player) => (
          <div key={player.username} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {player.isHost && <Crown className="w-4 h-4 text-neo-lime" />}
              {player.isBot && <Bot className="w-4 h-4 text-blue-400" />}
              {!player.isHost && !player.isBot && <User className="w-4 h-4 text-slate-400" />}
              <PlayerAvatar avatar={player.avatar} size="sm" />
              <span className="text-sm text-neo-white truncate max-w-[100px]">{player.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', PRESENCE_COLORS[player.presence])} />
              <span className="text-sm font-mono text-slate-300">{player.score}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {game.gameState === 'in-progress' ? (
            <span>{formatTimeLeft(game.timerSeconds)} {t('admin.live.left') || 'left'}</span>
          ) : (
            <span>{t('admin.live.started') || 'Started'} {formatTimeAgo(game.createdAt)}</span>
          )}
        </div>
        <span className="text-slate-500">{game.roomName}</span>
      </div>
    </motion.div>
  );
}

// Player Row Component
function PlayerRow({
  player,
  gameCode,
  language,
  t,
}: {
  player: LivePlayer;
  gameCode: string;
  language: string;
  t: (key: string) => string;
}) {
  const flag = LANGUAGE_FLAGS[language] || '🌐';

  return (
    <tr className="hover:bg-slate-700/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {player.isHost && <Crown className="w-4 h-4 text-neo-lime" />}
          {player.isBot && <Bot className="w-4 h-4 text-blue-400" />}
          <PlayerAvatar avatar={player.avatar} size="sm" />
          <span className="text-sm text-neo-white">{player.username}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span>{flag}</span>
          <span className="font-mono text-sm text-slate-300">{gameCode}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', PRESENCE_COLORS[player.presence])} />
          <span className="text-sm text-slate-300 capitalize">{player.presence}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-slate-300">{player.score}</span>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'px-2 py-0.5 text-xs rounded',
          player.isAuthenticated ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-300'
        )}>
          {player.isAuthenticated ? (t('admin.live.auth') || 'Auth') : (t('admin.live.guest') || 'Guest')}
        </span>
      </td>
    </tr>
  );
}

// Avatar Component
function PlayerAvatar({
  avatar,
  size = 'sm',
}: {
  avatar: LivePlayer['avatar'];
  size?: 'sm' | 'md';
}) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-sm' : 'w-8 h-8 text-base';

  if (avatar?.avatarImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar.avatarImage}
        alt=""
        width={size === 'sm' ? 24 : 32}
        height={size === 'sm' ? 24 : 32}
        className={cn('rounded-full', sizeClasses)}
      />
    );
  }

  return (
    <div
      className={cn('rounded-full flex items-center justify-center', sizeClasses)}
      style={{ backgroundColor: avatar?.color || '#374151' }}
    >
      {avatar?.emoji || '👤'}
    </div>
  );
}

export default LiveMonitor;

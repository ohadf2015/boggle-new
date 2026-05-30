'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import { RefreshCw, Users, Gamepad2, Wifi, Clock, Crown, Bot, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader } from '@/components/ui/Loader';
import { PageLoader } from '@/components/ui/PageLoader';
import Avatar from '@/components/Avatar';
import { presenceBreakdown, isStalled, hostName } from '@/lib/admin/liveMonitor/liveGameInsights';
import { gameModeLabel } from '@/lib/admin/gameLog/gameDisplay';

// Types matching backend DetailedGame and DetailedGamePlayer
interface LivePlayer {
  username: string;
  avatar: { emoji?: string; color?: string; avatarImage?: string; customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig } | null;
  isHost: boolean;
  isBot: boolean;
  presence: 'active' | 'idle' | 'afk' | 'disconnected';
  score: number;
  isAuthenticated: boolean;
  /** Auth user id for linking to admin player profile (null for guests/bots) */
  playerId?: string | null;
}

interface LiveSinglePlayerSession {
  sessionId: string;
  username: string;
  avatar: { emoji?: string; color?: string; avatarImage?: string; customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig } | null;
  language: string;
  mode: string;
  score: number;
  isAuthenticated: boolean;
  playerId: string | null;
  startedAt: number;
}

interface LiveGame {
  gameCode: string;
  roomName: string;
  language: string;
  gameState: 'waiting' | 'in-progress' | 'validating' | 'finished';
  isRanked: boolean;
  isPrivate: boolean;
  createdAt: number;
  timerSeconds: number;
  gameMode?: string;
  players: LivePlayer[];
}

interface LiveGamesResponse {
  games: LiveGame[];
  singlePlayers?: LiveSinglePlayerSession[];
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
  const [now, setNow] = useState<number>(Date.now());

  // Use ref for token to prevent callback recreation on token changes
  // This prevents interval accumulation bug
  const tokenRef = useRef(authToken);

  // Update token ref when prop changes (after refresh)
  useEffect(() => {
    tokenRef.current = authToken;
  }, [authToken]);

  const fetchLiveGames = useCallback(async (retryCount = 0): Promise<void> => {
    try {
      const response = await fetch('/api/admin/live-games', {
        headers: {
          Authorization: `Bearer ${tokenRef.current}`,
        },
      });

      // Handle 401 (token expired) - attempt refresh and retry once
      if (response.status === 401 && retryCount === 0 && onTokenExpired) {
        console.log('[LiveMonitor] Token expired, refreshing...');
        const newToken = await onTokenExpired();

        if (newToken) {
          tokenRef.current = newToken;
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
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [onTokenExpired]);

  // Initial fetch and auto-refresh every 5 seconds
  // Use ref-based callback to prevent interval recreation
  const fetchRef = useRef(fetchLiveGames);

  useEffect(() => {
    fetchRef.current = fetchLiveGames;
  }, [fetchLiveGames]);

  useEffect(() => {
    fetchRef.current();
    const interval = setInterval(() => fetchRef.current(), 5000);
    return () => clearInterval(interval);
  }, []); // Empty deps - stable interval

  // Update "now" timestamp for stalled detection every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchLiveGames();
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <PageLoader size="md" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={handleManualRefresh} variant="outline">
          {t('admin.live.retry')}
        </Button>
      </div>
    );
  }

  const { games = [], singlePlayers = [], stats } = data || {
    games: [],
    singlePlayers: [] as LiveSinglePlayerSession[],
    stats: { activeGames: 0, playersInGames: 0, socketConnections: 0, singlePlayerCount: 0 },
  };
  const hasAnyLive = games.length > 0 || singlePlayers.length > 0;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 shadow-hard">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Live Indicator */}
          <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="font-neo-display text-green-400">{t('admin.live.live')}</span>
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
                <Loader size="sm" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {t('admin.live.refresh')}
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-2 text-slate-300">
            <div className="flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span className="text-sm">{stats.activeGames} <span className="text-slate-500">{t('admin.live.games')}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm">{stats.playersInGames} <span className="text-slate-500">{t('admin.live.players')}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-sm">{stats.socketConnections} <span className="text-slate-500">{t('admin.live.sockets')}</span></span>
            </div>
            {stats.singlePlayerCount > 0 && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" />
                <span className="text-sm">{stats.singlePlayerCount} <span className="text-slate-500">{t('admin.live.singlePlayer')}</span></span>
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
            <Loader size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t('admin.live.refresh')}
        </Button>
      </div>

      {/* Games Grid or Empty State */}
      {!hasAnyLive ? (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 bg-neo-navy-light/30 rounded-neo border-neo border-black"
        >
          <Gamepad2 className="w-16 h-16 text-slate-500 mb-4" />
          <h3 className="text-xl font-neo-display text-slate-400 mb-2">
            {t('admin.live.noGames')}
          </h3>
          <p className="text-slate-500">
            {t('admin.live.noGamesHint')}
          </p>
        </m.div>
      ) : (
        <>
          {/* Active Games Section */}
          {games.length > 0 && (
            <div>
              <h2 className="text-lg font-neo-display text-neo-white mb-4">
                {t('admin.live.activeGames')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {games.map((game) => (
                    <GameCard key={game.gameCode} game={game} t={t} now={now} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Single Player Live Sessions */}
          {singlePlayers.length > 0 && (
            <div>
              <h2 className="text-lg font-neo-display text-neo-white mb-4">
                {t('admin.live.singlePlayerLive')}
              </h2>
              <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-neo-navy-elevated/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.player')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.mode')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.score')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.started')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.type')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {singlePlayers.map((sp) => (
                      <SinglePlayerRow key={sp.sessionId} session={sp} t={t} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Connected Players Table */}
          {games.length > 0 && (
            <div>
              <h2 className="text-lg font-neo-display text-neo-white mb-4">
                {t('admin.live.connectedPlayers')}
              </h2>
              <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-neo-navy-elevated/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.player')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.game')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.status')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.score')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                        {t('admin.live.type')}
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
          )}
        </>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-slate-500">
        {t('admin.live.lastUpdated')}: {new Date(lastRefresh).toLocaleTimeString()}
      </div>
    </div>
  );
}

// Game Card Component
function GameCard({
  game,
  t,
  now,
}: {
  game: LiveGame;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
  now: number;
}) {
  const flag = LANGUAGE_FLAGS[game.language] || '🌐';
  const stateColor = STATE_COLORS[game.gameState] || 'bg-gray-500';
  const stateLabel = game.gameState.replace('-', ' ');
  const stalledFlag = isStalled(game, now);
  const host = hostName(game.players);
  const breakdown = presenceBreakdown(game.players);
  const modeLabel = gameModeLabel(game.gameMode, t);

  return (
    <m.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 shadow-hard hover:translate-y-[-2px] transition-transform"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{flag}</span>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-neo-white text-sm">{game.gameCode}</span>
            {host && <span className="text-xs text-slate-400">{t('admin.live.host', 'Host')}: {host}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {game.isRanked && (
            <span className="px-2 py-0.5 text-xs bg-neo-lime text-black rounded font-bold">
              {t('admin.live.ranked')}
            </span>
          )}
          {game.isPrivate && (
            <span className="px-2 py-0.5 text-xs bg-slate-600 text-slate-200 rounded font-bold">
              {t('admin.live.private', 'Private')}
            </span>
          )}
          <span className={cn('px-2 py-0.5 text-xs rounded font-bold text-white capitalize', stateColor)}>
            {stateLabel}
          </span>
          {stalledFlag && (
            <span className="px-2 py-0.5 text-xs bg-neo-red text-white rounded font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t('admin.live.stalled', 'Stalled?')}
            </span>
          )}
        </div>
      </div>

      {/* Game Mode and Disconnected Count */}
      {(modeLabel !== '—' || breakdown.disconnected > 0) && (
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3 pb-3 border-b border-slate-700">
          {modeLabel !== '—' && <span className="text-slate-300">{modeLabel}</span>}
          {breakdown.disconnected > 0 && (
            <span className="text-neo-red font-bold">
              {breakdown.disconnected}/{breakdown.total} {t('admin.live.disconnected', 'disconnected')}
            </span>
          )}
        </div>
      )}

      {/* Players */}
      <div className="space-y-2 mb-3 border-t border-b border-slate-700 py-3">
        {game.players.map((player) => (
          <div key={player.username} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {player.isHost && <Crown className="w-4 h-4 text-neo-lime" />}
              {player.isBot && <Bot className="w-4 h-4 text-blue-400" />}
              {!player.isHost && !player.isBot && <User className="w-4 h-4 text-slate-400" />}
              <PlayerIdentityLink
                playerId={player.playerId}
                isAuthenticated={player.isAuthenticated}
                avatar={player.avatar}
                username={player.username}
                avatarSeed={player.username}
                truncate
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', PRESENCE_COLORS[player.presence])} />
              <span className="text-sm font-mono text-slate-300">{player.score}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {game.gameState === 'in-progress' ? (
              <span>{formatTimeLeft(game.timerSeconds)} {t('admin.live.left')}</span>
            ) : (
              <span>{t('admin.live.started')} {formatTimeAgo(game.createdAt)}</span>
            )}
          </div>
          <span className="text-slate-500">{game.roomName}</span>
        </div>
        {game.gameState !== 'in-progress' && (
          <div className="text-xs text-slate-500">
            {new Date(game.createdAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </m.div>
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
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}) {
  const flag = LANGUAGE_FLAGS[language] || '🌐';

  return (
    <tr className="hover:bg-neo-navy-elevated/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {player.isHost && <Crown className="w-4 h-4 text-neo-lime" />}
          {player.isBot && <Bot className="w-4 h-4 text-blue-400" />}
          <PlayerIdentityLink
            playerId={player.playerId}
            isAuthenticated={player.isAuthenticated}
            avatar={player.avatar}
            username={player.username}
            avatarSeed={player.username}
          />
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
          {player.isAuthenticated ? (t('admin.live.auth')) : (t('admin.live.guest'))}
        </span>
      </td>
    </tr>
  );
}

// Single Player Live Session Row
function SinglePlayerRow({
  session,
  t,
}: {
  session: LiveSinglePlayerSession;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}) {
  const flag = LANGUAGE_FLAGS[session.language] || '🌐';

  return (
    <tr className="hover:bg-neo-navy-elevated/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <PlayerIdentityLink
            playerId={session.playerId}
            isAuthenticated={session.isAuthenticated}
            avatar={session.avatar}
            username={session.username}
            avatarSeed={session.playerId || session.sessionId}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>{flag}</span>
          <span className="capitalize">{session.mode.replace(/[-_]/g, ' ')}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-slate-300">{session.score}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{formatTimeAgo(session.startedAt)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'px-2 py-0.5 text-xs rounded',
          session.isAuthenticated ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-300'
        )}>
          {session.isAuthenticated ? t('admin.live.auth') : t('admin.live.guest')}
        </span>
      </td>
    </tr>
  );
}

// Linked player identity (avatar + name) — links to admin profile when authed.
function PlayerIdentityLink({
  playerId,
  isAuthenticated,
  avatar,
  username,
  avatarSeed,
  truncate,
}: {
  playerId?: string | null;
  isAuthenticated: boolean;
  avatar: LivePlayer['avatar'];
  username: string;
  avatarSeed: string;
  truncate?: boolean;
}) {
  const content = (
    <>
      <Avatar
        customAvatar={avatar?.customAvatar}
        userId={avatar?.avatarImage || avatarSeed}
        size="sm"
      />
      <span className={cn('text-sm text-neo-white', truncate && 'truncate max-w-[100px]')}>
        {username}
      </span>
    </>
  );

  if (isAuthenticated && playerId) {
    return (
      <Link
        href={`/admin/players/${playerId}`}
        className="flex items-center gap-2 hover:underline focus:outline-none focus:ring-2 focus:ring-neo-lime rounded"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-2">{content}</div>;
}

export default LiveMonitor;

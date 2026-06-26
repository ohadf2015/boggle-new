'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Monitor, Users, Clock, Trophy, Wifi, WifiOff, Maximize, Minimize, QrCode, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';

// Dynamic imports for heavy components
const QRCode = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false });

interface PartyPlayer {
  username: string;
  score: number;
  wordCount: number;
  avatar?: {
    emoji?: string;
    color?: string;
    avatarImage?: string;
  };
  isHost?: boolean;
}

interface WordEvent {
  username: string;
  word: string;
  score: number;
  timestamp: number;
}

interface GameState {
  phase: 'waiting' | 'countdown' | 'playing' | 'results';
  players: PartyPlayer[];
  timeRemaining: number;
  totalTime: number;
  recentWords: WordEvent[];
  grid?: string[][];
  language?: string;
}

/**
 * Party Screen - TV/Projector Display
 *
 * Features:
 * - Large QR code for joining
 * - Live leaderboard
 * - Recent words feed
 * - Timer display
 * - Optimized for 16:9 TV screens
 *
 * Mobile Safety:
 * - Separate route, doesn't affect mobile game
 * - Spectator-only mode
 */
export default function PartyScreen() {
  const params = useParams();
  const roomCode = (params?.roomCode as string)?.toUpperCase() || '';
  const { t } = useLanguage();

  // Socket connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    players: [],
    timeRemaining: 0,
    totalTime: 180,
    recentWords: [],
  });

  // Connect to socket
  useEffect(() => {
    if (!roomCode) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      logger.log('[PartyScreen] Connected to socket');
      setIsConnected(true);
      // Join room as spectator
      newSocket.emit('joinAsSpectator', { roomCode });
    });

    newSocket.on('disconnect', () => {
      logger.log('[PartyScreen] Disconnected from socket');
      setIsConnected(false);
    });

    // Game state updates
    newSocket.on('gameStateUpdate', (data: Partial<GameState>) => {
      logger.log('[PartyScreen] Game state update:', data);
      setGameState(prev => ({ ...prev, ...data }));
    });

    // Player score updates
    newSocket.on('scoreUpdate', (data: { players: PartyPlayer[] }) => {
      setGameState(prev => ({ ...prev, players: data.players }));
    });

    // Timer updates
    newSocket.on('timerUpdate', (data: { timeRemaining: number }) => {
      setGameState(prev => ({ ...prev, timeRemaining: data.timeRemaining }));
    });

    // Word found events
    newSocket.on('wordFound', (data: WordEvent) => {
      setGameState(prev => ({
        ...prev,
        recentWords: [data, ...prev.recentWords].slice(0, 10),
      }));
    });

    // Game phase changes
    newSocket.on('gamePhaseChange', (data: { phase: GameState['phase'] }) => {
      setGameState(prev => ({ ...prev, phase: data.phase }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      logger.warn('[PartyScreen] Fullscreen toggle failed:', err);
    }
  }, []);

  // Generate join URL
  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/join/${roomCode}`;
  }, [roomCode]);

  // Sorted players by score
  const sortedPlayers = useMemo(() =>
    [...gameState.players].sort((a, b) => b.score - a.score),
    [gameState.players]
  );

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-neo-navy text-neo-white overflow-hidden flex flex-col">
      {/* Halftone texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '12px 12px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b-4 border-neo-cream/20">
        <div className="flex items-center gap-4">
          <Monitor className="w-8 h-8 text-neo-lime" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              {t('partyScreen.title')}
            </h1>
            <p className="text-sm text-neo-white">
              {t('partyScreen.room')}: <span className="font-bold text-neo-lime">{roomCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full border-2',
            isConnected
              ? 'bg-neo-green/20 border-neo-green text-neo-green'
              : 'bg-neo-red/20 border-neo-red text-neo-red'
          )}>
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-sm font-bold uppercase">
              {isConnected ? t('partyScreen.live') : t('partyScreen.connecting')}
            </span>
          </div>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 bg-neo-cream/10 border-2 border-neo-cream/30 rounded-neo hover:bg-neo-cream/20 transition-colors"
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Main content - 3 column layout */}
      <main className="relative z-10 flex-1 flex gap-6 p-6 min-h-0">
        {/* Left column: QR Code + Join info */}
        <div className="w-80 flex flex-col gap-6">
          {/* QR Code Card */}
          <div className="bg-neo-cream text-neo-black p-6 rounded-neo-lg border-4 border-neo-black shadow-hard-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase">{t('partyScreen.scanToJoin')}</h2>
            </div>
            <div className="bg-white text-black p-4 rounded-neo border-2 border-neo-black inline-block">
              <QRCode value={joinUrl} size={200} level="M" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-neo-black/60 uppercase">{t('partyScreen.orEnterCode')}</p>
              <p className="text-4xl font-black tracking-widest mt-1">{roomCode}</p>
            </div>
          </div>

          {/* Player count */}
          <div className="flex items-center gap-3 bg-neo-pink/20 border-2 border-neo-pink p-4 rounded-neo">
            <Users className="w-8 h-8 text-neo-pink" />
            <div>
              <p className="text-3xl font-black">{sortedPlayers.length}</p>
              <p className="text-sm text-neo-white uppercase">{t('partyScreen.players')}</p>
            </div>
          </div>
        </div>

        {/* Center column: Timer + Game state */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Phase indicator */}
          <AnimatePresence mode="wait">
            <m.div
              key={gameState.phase}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              {gameState.phase === 'waiting' && (
                <div className="space-y-4">
                  <p className="text-2xl font-bold text-neo-white uppercase animate-pulse">
                    {t('partyScreen.waitingForPlayers')}
                  </p>
                  <p className="text-lg text-neo-white">
                    {t('partyScreen.hostWillStart')}
                  </p>
                </div>
              )}

              {gameState.phase === 'countdown' && (
                <div className="text-9xl font-black text-neo-lime animate-bounce">
                  {gameState.timeRemaining}
                </div>
              )}

              {gameState.phase === 'playing' && (
                <div className="space-y-6">
                  {/* Large timer */}
                  <div className="flex items-center justify-center gap-4">
                    <Clock className="w-12 h-12 text-neo-lime" />
                    <span className={cn(
                      'text-8xl font-black',
                      gameState.timeRemaining <= 10 ? 'text-neo-red animate-pulse' : 'text-neo-lime'
                    )}>
                      {formatTime(gameState.timeRemaining)}
                    </span>
                  </div>
                </div>
              )}

              {gameState.phase === 'results' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Trophy className="w-24 h-24 text-neo-lime mx-auto" />
                    <p className="text-4xl font-black text-neo-lime uppercase mt-4">
                      {t('partyScreen.gameOver')}
                    </p>
                  </div>

                  {/* Recent words feed - shown after game ends */}
                  {gameState.recentWords.length > 0 && (
                    <div className="bg-neo-cream/10 border-2 border-neo-cream/20 rounded-neo p-4 max-w-md mx-auto">
                      <h3 className="text-sm font-bold text-neo-white uppercase mb-2">
                        {t('partyScreen.recentWords')}
                      </h3>
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {gameState.recentWords.slice(0, 5).map((event) => (
                            <m.div
                              key={`${event.username}-${event.word}-${event.timestamp}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="flex items-center justify-between bg-neo-cream/5 px-3 py-2 rounded-neo"
                            >
                              <span className="font-bold text-neo-white">{event.username}</span>
                              <span className="font-black text-neo-lime uppercase">{event.word}</span>
                              <span className="text-neo-green font-bold">+{event.score}</span>
                            </m.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </m.div>
          </AnimatePresence>
        </div>

        {/* Right column: Leaderboard */}
        <div className="w-96 bg-neo-cream/5 border-2 border-neo-cream/20 rounded-neo-lg p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-6 h-6 text-neo-lime" />
            <h2 className="text-xl font-black uppercase">{t('partyScreen.leaderboard')}</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            <AnimatePresence mode="popLayout">
              {sortedPlayers.map((player, index) => (
                <m.div
                  key={player.username}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-neo border-2',
                    index === 0 ? 'bg-neo-lime text-neo-black border-neo-black' :
                    index === 1 ? 'bg-slate-300 text-neo-black border-neo-black' :
                    index === 2 ? 'bg-orange-400 text-neo-black border-neo-black' :
                    'bg-neo-cream/10 border-neo-cream/30'
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 border-neo-black',
                    index < 3 ? 'bg-neo-cream' : 'bg-neo-cream/20'
                  )}>
                    {index + 1}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-bold truncate',
                      index < 3 ? 'text-neo-black' : 'text-neo-white'
                    )}>
                      {player.username}
                      {player.isHost && <Crown className="ms-1 w-3 h-3 inline-block" />}
                    </p>
                    <p className={cn(
                      'text-xs',
                      index < 3 ? 'text-neo-black/60' : 'text-neo-white'
                    )}>
                      {player.wordCount} {t('partyScreen.words')}
                    </p>
                  </div>

                  {/* Score */}
                  <div className={cn(
                    'text-2xl font-black',
                    index < 3 ? 'text-neo-black' : 'text-neo-lime'
                  )}>
                    {player.score}
                  </div>
                </m.div>
              ))}
            </AnimatePresence>

            {sortedPlayers.length === 0 && (
              <div className="text-center text-neo-white py-8">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('partyScreen.noPlayersYet')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

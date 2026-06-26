'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { Play, X, Users, Radio } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { io, Socket } from 'socket.io-client';
import { getSocketURL } from '@/utils/SocketContext';

export interface ClassroomGameBannerProps {
  /** The classroom ID to listen for games */
  classroomId: string;
  /** Current user ID */
  userId: string;
  /** Current username */
  username: string;
}

interface ActiveGame {
  gameCode: string;
  teacherName: string;
  lessonNames: string[];
  playerCount?: number;
}

/** Polling interval for active game discovery (ms) */
const POLL_INTERVAL = 15_000;

/**
 * ClassroomGameBanner - Notification banner for active classroom games
 *
 * Shows a prominent banner when a teacher starts a game in the student's classroom.
 * Uses WebSocket for instant notifications + polling fallback for reliability.
 */
export function ClassroomGameBanner({
  classroomId,
  userId,
  username,
}: ClassroomGameBannerProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request active games from server (used on connect, reconnect, and polling)
  const requestActiveGames = useCallback((sock: Socket) => {
    if (sock.connected) {
      sock.emit('getActiveClassroomGames', { classroomId });
    }
  }, [classroomId]);

  useEffect(() => {
    const socketUrl = getSocketURL();
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // Join classroom room + fetch active games
      requestActiveGames(socketInstance);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Re-request on reconnect to catch games created while disconnected
    socketInstance.io.on('reconnect', () => {
      requestActiveGames(socketInstance);
    });

    // Listen for new games created (real-time)
    socketInstance.on('classroomGameCreated', (data: {
      gameCode: string;
      teacherName: string;
      lessonNames: string[];
    }) => {
      setDismissed(false);
      setActiveGame({
        gameCode: data.gameCode,
        teacherName: data.teacherName,
        lessonNames: data.lessonNames,
      });
    });

    // Listen for active games list (response to getActiveClassroomGames)
    socketInstance.on('activeClassroomGames', (data: { games: ActiveGame[] }) => {
      if (data.games && data.games.length > 0) {
        setActiveGame(data.games[0]);
      }
    });

    // Listen for player join updates
    socketInstance.on('classroomGamePlayerJoined', (data: {
      gameCode: string;
      playerCount: number;
    }) => {
      setActiveGame((current) => {
        if (current && current.gameCode === data.gameCode) {
          return { ...current, playerCount: data.playerCount };
        }
        return current;
      });
    });

    setSocket(socketInstance);

    // Polling fallback: periodically check for active games
    // Catches games missed due to timing or brief disconnects
    pollIntervalRef.current = setInterval(() => {
      requestActiveGames(socketInstance);
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      socketInstance.disconnect();
    };
  }, [classroomId, requestActiveGames]);

  const handleJoinGame = () => {
    if (!activeGame || !socket) return;

    setIsJoining(true);

    // Emit join event
    socket.emit('joinClassroomGame', {
      gameCode: activeGame.gameCode,
      userId,
      username,
    });

    // Navigate to game
    router.push(`/${language}/multiplayer?code=${activeGame.gameCode}&classroom=true`);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setActiveGame(null);
  };

  // Always show the "listening" indicator even when no game is active
  // F-18/F-19: friendlier idle copy + pulsing radar animation so the empty
  // state still feels alive instead of looking broken.
  if (!activeGame) {
    return (
      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className={cn(
          'relative flex items-center gap-3 px-4 py-3 rounded-neo border-2 border-black shadow-hard-sm overflow-hidden',
          isConnected ? 'bg-neo-cyan/20' : 'bg-neo-lime/20'
        )}
      >
        {/* Radar pulse ring */}
        <span className="relative flex w-8 h-8 shrink-0 items-center justify-center">
          {isConnected && (
            <span className="absolute inset-0 rounded-full bg-neo-cyan/40 animate-ping" />
          )}
          <span
            className={cn(
              'relative flex w-8 h-8 items-center justify-center rounded-full border-2 border-black shadow-hard-sm',
              isConnected ? 'bg-neo-cyan' : 'bg-neo-lime'
            )}
          >
            <Radio className="w-4 h-4 text-black" aria-hidden="true" />
          </span>
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-neo-display font-black text-black uppercase tracking-wide">
            {isConnected
              ? t('student.activeGame.listening')
              : t('student.activeGame.connecting')}
          </span>
          <span className="text-xs font-neo-body text-black/60">
            {t('student.activeGame.idleHint')}
          </span>
        </div>
      </m.div>
    );
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative rounded-neo border-3 border-black shadow-hard overflow-hidden"
      >
        {/* Vivid top bar */}
        <div className="bg-neo-cyan px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-neo bg-black border-2 border-black flex items-center justify-center shadow-hard-sm">
                <Play className="w-5 h-5 text-neo-cyan animate-pulse" />
              </div>
              <h3 className="text-xl font-neo-display font-black text-black">
                {t('student.activeGame.title')}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-neo border-2 border-black bg-white/40 hover:bg-white/60 shadow-hard-sm text-black transition-all"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dark body */}
        <div className="bg-neo-navy-light px-6 py-4">
          <p className="text-neo-white font-neo-body font-bold mb-3">
            {t('student.activeGame.teacherStarted', { teacher: activeGame.teacherName })}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {activeGame.lessonNames.map((name, idx) => (
              <span
                key={`lesson-${idx}-${name}`}
                className="px-3 py-1 text-sm font-black bg-neo-pink border-2 border-black text-black rounded-neo shadow-hard-sm"
              >
                {name}
              </span>
            ))}
          </div>

          {activeGame.playerCount && activeGame.playerCount > 0 && (
            <div className="flex items-center gap-2 text-black/60 text-sm font-bold mb-4">
              <Users className="w-4 h-4" />
              <span>{activeGame.playerCount} {t('multiplayer.playersJoined')}</span>
            </div>
          )}

          {/* Join Button */}
          <button
            type="button"
            onClick={handleJoinGame}
            disabled={isJoining}
            className={cn(
              'w-full px-6 py-4 font-black text-lg rounded-neo',
              'bg-neo-lime text-black',
              'border-3 border-black shadow-hard',
              'hover:shadow-hard-lg hover:-translate-y-0.5',
              'active:shadow-hard-sm active:translate-y-0.5',
              'transition-all duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isJoining ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {t('student.activeGame.joining')}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Play className="w-6 h-6" />
                {t('student.activeGame.joinNow')}
              </span>
            )}
          </button>
        </div>
      </m.div>
    </AnimatePresence>
  );
}

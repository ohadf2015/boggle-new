'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Users } from 'lucide-react';
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

/**
 * ClassroomGameBanner - Notification banner for active classroom games
 *
 * Shows a prominent banner when a teacher starts a game in the student's classroom.
 * Provides a quick "Join Game" button for instant access.
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

  useEffect(() => {
    // Initialize Socket.IO connection
    // Use shared socket URL to ensure production compatibility
    // (production uses NEXT_PUBLIC_WS_URL, not /api/socket)
    const socketUrl = getSocketURL();
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      // Join classroom room to receive notifications
      socketInstance.emit('getActiveClassroomGames', { classroomId });
    });

    // Listen for new games created
    socketInstance.on('classroomGameCreated', (data: {
      gameCode: string;
      teacherName: string;
      lessonNames: string[];
    }) => {
      setActiveGame({
        gameCode: data.gameCode,
        teacherName: data.teacherName,
        lessonNames: data.lessonNames,
      });
    });

    // Listen for active games list
    socketInstance.on('activeClassroomGames', (data: { games: ActiveGame[] }) => {
      if (data.games && data.games.length > 0) {
        // Show the first active game
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

    return () => {
      socketInstance.disconnect();
    };
  }, [classroomId]);

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
    setActiveGame(null);
  };

  if (!activeGame) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'relative mb-6 p-6 rounded-neo border-neo-thick border-neo-cyan',
          'bg-gradient-to-r from-neo-cyan/20 to-neo-pink/20',
          'shadow-hard-lg overflow-hidden'
        )}
      >
        {/* Animated background pulse */}
        <motion.div
          className="absolute inset-0 bg-neo-cyan/10"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-6 h-6 text-neo-cyan animate-pulse" />
                <h3 className="text-xl font-neo-display text-neo-white font-black">
                  {t('student.activeGame.title')}
                </h3>
              </div>

              <p className="text-neo-white/80 font-neo-body mb-3">
                {t('student.activeGame.teacherStarted', { teacher: activeGame.teacherName })}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {activeGame.lessonNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-sm font-bold bg-neo-pink text-neo-white rounded-neo border border-neo-pink/50"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {activeGame.playerCount && activeGame.playerCount > 0 && (
                <div className="flex items-center gap-2 text-neo-white/60 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{activeGame.playerCount} {t('multiplayer.playersJoined')}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="p-2 rounded-neo border-neo border-neo-black bg-neo-navy/50 hover:bg-neo-navy shadow-hard-sm text-neo-white"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoinGame}
            disabled={isJoining}
            className={cn(
              'w-full px-6 py-4 font-black text-lg',
              'bg-neo-lime text-neo-black',
              'border-neo-thick border-neo-black rounded-neo shadow-hard',
              'hover:shadow-hard-lg hover:translate-y-[-2px]',
              'active:shadow-hard active:translate-y-0',
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
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketURL } from '@/utils/SocketContext';

export interface ActiveGame {
  gameCode: string;
  teacherName: string;
  lessonNames: string[];
  playerCount?: number;
}

const POLL_INTERVAL = 15_000;

/**
 * Hook to detect active classroom games via Socket.IO.
 * Extracted from ClassroomGameBanner for reuse.
 */
export function useActiveClassroomGame(classroomId: string) {
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestActiveGames = useCallback((sock: Socket) => {
    if (sock.connected) {
      sock.emit('getActiveClassroomGames', { classroomId });
    }
  }, [classroomId]);

  useEffect(() => {
    const socketUrl = getSocketURL();
    let socketInstance: ReturnType<typeof io>;

    async function initSocket() {
      let token: string | undefined;
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch {
        // proceed without token
      }

      socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        auth: token ? { token } : {},
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        requestActiveGames(socketInstance);
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
      });

      socketInstance.io.on('reconnect', () => {
        requestActiveGames(socketInstance);
      });

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

      socketInstance.on('activeClassroomGames', (data: { games: ActiveGame[] }) => {
        if (data.games && data.games.length > 0) {
          setActiveGame(data.games[0]);
        }
      });

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

      pollIntervalRef.current = setInterval(() => {
        requestActiveGames(socketInstance);
      }, POLL_INTERVAL);
    }

    initSocket();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      socketInstance?.disconnect();
    };
  }, [classroomId, requestActiveGames]);

  return { activeGame, isConnected, socket, setActiveGame };
}

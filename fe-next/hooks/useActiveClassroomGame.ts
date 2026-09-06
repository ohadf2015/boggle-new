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
 *
 * The ONE place the student client listens for their class's live game.
 * `ClassroomGameBanner` used to carry a second, near-identical copy of this
 * logic that opened its socket with no auth token — the server rejected it
 * before ever subscribing it to `classroom:<id>`, so the banner could never
 * fire (recurring pitfall class 3: two routes, one silently weaker).
 *
 * Clearing is as load-bearing as setting: a game that ends must take its JOIN
 * button with it, or the student taps through to a dead multiplayer room.
 * Both clear paths — an empty `activeClassroomGames` list and the server's
 * `classroomGameEnded` broadcast — are handled here.
 */
export function useActiveClassroomGame(classroomId: string) {
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        classroomId?: string;
        teacherName: string;
        lessonNames: string[];
      }) => {
        // Trust the payload's own scope, not just the room we think we are in.
        // The server sends classroomId and this ignored it, so any path that
        // ever put this socket in a second classroom room would surface another
        // class's game under this student's banner. Also refuse a record with no
        // room code: it cannot be joined, so it must not be advertised.
        if (data?.classroomId && data.classroomId !== classroomId) return;
        if (!data?.gameCode) return;
        setError(null);
        setActiveGame({
          gameCode: data.gameCode,
          teacherName: data.teacherName,
          lessonNames: data.lessonNames,
        });
      });

      // The list is authoritative in BOTH directions. An empty list means the
      // game is over (or its Redis key expired); leaving the old one on screen
      // is what kept "JOIN NOW" pointing at a dead room.
      socketInstance.on('activeClassroomGames', (data: { games: ActiveGame[] }) => {
        setError(null);
        // A Redis set has no order, so `games[0]` is arbitrary. Take the first
        // one that is actually joinable rather than whichever the store handed
        // back — that arbitrariness is what showed students an older game's
        // lesson name and then walked them into a dead room.
        const joinable = (data?.games ?? []).find((g) => !!g?.gameCode) ?? null;
        setActiveGame(joinable);
      });

      // The server broadcasts this from every end-of-round path.
      socketInstance.on('classroomGameEnded', (data: { gameCode?: string }) => {
        setActiveGame((current) => {
          if (!current) return null;
          // No gameCode on the payload → end whatever this classroom was running.
          if (data?.gameCode && data.gameCode !== current.gameCode) return current;
          return null;
        });
      });

      // Rejections used to vanish. "Not a member", "Authentication required" and
      // a bad payload all looked exactly like "no game is running" (class 4).
      socketInstance.on('classroomGameError', (data: { error?: string }) => {
        setError(data?.error ?? 'unknown');
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

  return { activeGame, isConnected, socket, setActiveGame, error };
}

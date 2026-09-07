'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketURL } from '@/utils/SocketContext';

export interface ActiveGame {
  gameCode: string;
  teacherName: string;
  lessonNames: string[];
  playerCount?: number;
  /** Which classroom this game belongs to. Absent from an older server. */
  classroomId?: string;
  /** That classroom's display name, resolved server-side. Absent from an older server. */
  classroomName?: string | null;
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
    let socketInstance: ReturnType<typeof io> | undefined;
    /**
     * The teardown flag, and the whole reason this hook could show another
     * class's game.
     *
     * `initSocket` is async: it awaits `getSession()` before `socketInstance`
     * is ever assigned. React runs this effect's cleanup the moment
     * `classroomId` changes — INSIDE that window — so `socketInstance
     * ?.disconnect()` had nothing to disconnect and silently did nothing
     * (recurring pitfall class 4). The classroom-A socket then lived forever:
     * still subscribed to `classroom:A`, still polling every 15 seconds, and
     * still holding the same stable `setActiveGame` — so it kept writing
     * classroom A's game into a hook that now represents classroom B.
     *
     * Cleanup therefore records the intent, and the async setup honours it
     * whenever it finally lands.
     */
    let cancelled = false;

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

      // A non-optional local so the listener closures below have a socket that
      // cannot be undefined; `socketInstance` exists only for the cleanup path.
      const sock = io(socketUrl, {
        transports: ['websocket', 'polling'],
        auth: token ? { token } : {},
      });
      socketInstance = sock;

      // The classroom changed (or the page unmounted) while the session was
      // resolving. Close this one immediately and wire up nothing.
      if (cancelled) {
        sock.disconnect();
        return;
      }

      sock.on('connect', () => {
        setIsConnected(true);
        requestActiveGames(sock);
      });

      sock.on('disconnect', () => {
        setIsConnected(false);
      });

      sock.io.on('reconnect', () => {
        requestActiveGames(sock);
      });

      sock.on('classroomGameCreated', (data: {
        gameCode: string;
        classroomId?: string;
        classroomName?: string | null;
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
          classroomId: data.classroomId,
          classroomName: data.classroomName,
          teacherName: data.teacherName,
          lessonNames: data.lessonNames,
        });
      });

      // The list is authoritative in BOTH directions. An empty list means the
      // game is over (or its Redis key expired); leaving the old one on screen
      // is what kept "JOIN NOW" pointing at a dead room.
      sock.on('activeClassroomGames', (data: { classroomId?: string; games: ActiveGame[] }) => {
        // Whose answer is this? The payload used to say nothing, so the client
        // had no way to tell and trusted every one of them. A response for a
        // classroom this hook is not watching is not evidence about this
        // classroom — in particular it must never CLEAR a running game.
        if (data?.classroomId && data.classroomId !== classroomId) return;
        setError(null);
        // A Redis set has no order, so `games[0]` is arbitrary. Take the first
        // one that is actually joinable rather than whichever the store handed
        // back — that arbitrariness is what showed students an older game's
        // lesson name and then walked them into a dead room.
        //
        // Each game is re-checked against this classroom too. `classroomId` is
        // optional only so an older server (which sends neither) keeps working;
        // when it IS present it is authoritative.
        const joinable = (data?.games ?? []).find(
          (g) => !!g?.gameCode && (!g.classroomId || g.classroomId === classroomId)
        ) ?? null;
        setActiveGame(joinable);
      });

      // The server broadcasts this from every end-of-round path.
      sock.on('classroomGameEnded', (data: { gameCode?: string }) => {
        setActiveGame((current) => {
          if (!current) return null;
          // No gameCode on the payload → end whatever this classroom was running.
          if (data?.gameCode && data.gameCode !== current.gameCode) return current;
          return null;
        });
      });

      // Rejections used to vanish. "Not a member", "Authentication required" and
      // a bad payload all looked exactly like "no game is running" (class 4).
      sock.on('classroomGameError', (data: { error?: string }) => {
        setError(data?.error ?? 'unknown');
      });

      sock.on('classroomGamePlayerJoined', (data: {
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

      setSocket(sock);

      pollIntervalRef.current = setInterval(() => {
        requestActiveGames(sock);
      }, POLL_INTERVAL);
    }

    initSocket();
    return () => {
      cancelled = true;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      socketInstance?.disconnect();
    };
  }, [classroomId, requestActiveGames]);

  return { activeGame, isConnected, socket, setActiveGame, error };
}

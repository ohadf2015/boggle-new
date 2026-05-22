/**
 * Socket.IO connection and event handling for multiplayer games
 * Manages connection lifecycle, room events, and error handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import {
  getSharedSocket,
  releaseSharedSocket,
  getSharedSocketIfExists,
  getSocketURL,
} from '@/utils/SocketContext';
import { saveSession, clearSessionPreservingUsername, getSession } from '@/utils/session';
import { resolveHostLeftMessage } from '@/lib/multiplayer/resolveHostLeftMessage';
import logger from '@/utils/logger';
import { captureSocketError, addGameBreadcrumb, isExpectedError } from '@/utils/sentry';
import type { ActiveRoom, Language, Avatar } from '@/shared/types/game';

const SOCKET_CONFIG = {
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 30000,
  HOST_KEEP_ALIVE_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 15000,
  ROOMS_LOADING_TIMEOUT: 3000,
};

interface UseMultiplayerSocketOptions {
  language: Language;
  gameCode: string;
  username: string;
  roomName: string;
  isActive: boolean;
  isHost: boolean;
  roomLanguage: Language | null;
  onJoined: (data: {
    gameCode: string;
    isHost: boolean;
    username: string;
    language?: Language;
    roomName?: string;
    isPrivate?: boolean;
  }) => void;
  onUpdateUsers: (users: Array<{ username: string; score?: number; avatar?: Avatar; isHost?: boolean; isBot?: boolean; presenceStatus?: string; isWindowFocused?: boolean }>) => void;
  onActiveRooms: (rooms: ActiveRoom[]) => void;
  onJoinedAsSpectator: (data: {
    gameCode: string;
    roomName: string;
    username?: string;
    language: Language;
  }) => void;
  onSpectatorList: (spectators: Array<{ username: string; socketId: string; avatar: unknown }>) => void;
  onSpectatorUpgraded: (data: {
    success: boolean;
    username: string;
    lateJoin?: boolean;
    users?: Array<{ username: string; score?: number }>;
  }) => void;
  onError: (error: { message?: string; code?: string }) => void;
  onGameStart: (data: { letterGrid: string[][]; timerSeconds: number; language: Language; minWordLength?: number; messageId?: string }) => void;
  onGameReset: () => void;
  onHostLeftRoomClosing: (data: {
    message?: string;
    i18nKey?: string;
    i18nParams?: Record<string, string | number>;
    reason?: 'explicit_no_successor' | 'grace_expired' | 'host_switched_room';
    resolvedMessage?: string;
  }) => void;
  onSessionMigrated: (data: { message?: string }) => void;
  onWarning: (data: { type?: string; message?: string }) => void;
  onRateLimited: () => void;
  onHostTransferred: (data: { newHost: string }) => void;
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}

interface UseMultiplayerSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  roomsLoading: boolean;
  attemptingReconnect: boolean;
  setAttemptingReconnect: (value: boolean) => void;
  setRoomsLoading: (value: boolean) => void;
  refreshRooms: () => void;
  signalIntentionalLeave: () => void;
}

/**
 * Manages Socket.IO connection and multiplayer game events
 */
export function useMultiplayerSocket(
  options: UseMultiplayerSocketOptions
): UseMultiplayerSocketReturn {
  const {
    gameCode,
    isActive,
    isHost,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [roomsLoading, setRoomsLoading] = useState<boolean>(true);
  const [attemptingReconnect, setAttemptingReconnect] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const wasConnectedRef = useRef<boolean>(false);
  const intentionalLeaveRef = useRef<boolean>(false);
  const hostKeepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptingReconnectRef = useRef<boolean>(attemptingReconnect);
  const reconnectFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kickedReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Latest-ref pattern: keeps a stable ref to the latest options so socket
  // callbacks (registered once) always read fresh values without re-registering
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    attemptingReconnectRef.current = attemptingReconnect;
  }, [attemptingReconnect]);

  // Initialize Socket.IO connection using shared singleton
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingSocket = getSharedSocketIfExists();
    const isReusingSocket = existingSocket && existingSocket.connected;

    const socketUrl = getSocketURL();
    logger.log(
      '[SOCKET.IO] MultiplayerPage using shared socket:',
      socketUrl,
      isReusingSocket ? '(reusing existing)' : '(creating new)'
    );

    const socketInstance = isReusingSocket ? existingSocket : getSharedSocket();
    socketRef.current = socketInstance;

    // For already-connected sockets, set state immediately and request active rooms
    if (socketInstance.connected) {
      setSocket(socketInstance);
      setIsConnected(true);
      socketInstance.emit('getActiveRooms');
    }

    // Remove any existing listeners before adding new ones
    const eventNames = [
      'connect',
      'disconnect',
      'connect_error',
      'reconnect',
      'reconnect_failed',
      'joined',
      'updateUsers',
      'activeRooms',
      'joinedAsSpectator',
      'spectatorList',
      'spectatorUpgraded',
      'debugGameStateResponse',
      'error',
      'startGame',
      'resetGame',
      'hostLeftRoomClosing',
      'sessionMigrated',
      'warning',
      'rateLimited',
      'hostTransferred',
      'kicked',
      'playerKicked',
      'afkWarning',
      'pong',
    ];
    eventNames.forEach((event) => socketInstance.off(event));

    // Connection events
    socketInstance.on('connect', () => {
      logger.log('[SOCKET.IO] Connected:', socketInstance.id);
      setIsConnected(true);
      setSocket(socketInstance);
      socketInstance.emit('getActiveRooms');

      // Handle reconnection to game - re-emit join to restore server-side state
      // Uses getSession() which reads from the cookie (same source as saveSession)
      // This is critical for CrazyGames iframe where the socket can disconnect/reconnect
      // due to visibility changes, giving the socket a new ID and losing server mappings
      if (wasConnectedRef.current && !intentionalLeaveRef.current) {
        const savedSession = getSession();
        if (savedSession && savedSession.gameCode && savedSession.username) {
          logger.log('[SOCKET.IO] Reconnecting to game:', savedSession.gameCode);
          // Silent reconnect — the socket-status indicator already conveys this
          // and a "Reconnecting..." toast on every wifi blip was noise.
          // Re-emit join with full identity context for proper server-side matching
          // Missing authUserId caused reconnections to lose authenticated player mapping
          const joinPayload: Record<string, unknown> = {
            gameCode: savedSession.gameCode,
            username: savedSession.username,
          };
          // Forward auth context from socket handshake if available
          const socketAuth = socketInstance.auth as Record<string, unknown> | undefined;
          if (socketAuth?.token) {
            joinPayload.authToken = socketAuth.token;
          }
          socketInstance.emit('join', joinPayload);
        }
      }
      wasConnectedRef.current = true;
    });

    socketInstance.on('disconnect', (reason) => {
      logger.log('[SOCKET.IO] Disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      logger.error('[SOCKET.IO] Connection error:', error.message);
      captureSocketError(error, {
        event: 'connect_error',
        gameCode: optionsRef.current.gameCode || undefined,
        socketId: socketInstance.id || undefined,
        username: optionsRef.current.username || undefined,
      });
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      logger.log('[SOCKET.IO] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socketInstance.on('reconnect_failed', () => {
      logger.error('[SOCKET.IO] Reconnection failed');
      captureSocketError(new Error('Reconnection exhausted after max attempts'), {
        event: 'reconnect_failed',
        gameCode: optionsRef.current.gameCode || undefined,
        socketId: socketInstance.id || undefined,
        username: optionsRef.current.username || undefined,
      });
    });

    // Game events
    socketInstance.on('joined', (data) => {
      logger.log('[SOCKET.IO] ✅ Joined successfully:', data);
      addGameBreadcrumb('room_joined', {
        gameCode: data.gameCode,
        isHost: data.isHost,
        username: data.username,
      });
      optionsRef.current.onJoined(data);
      setAttemptingReconnect(false);

      // Safety net: for a reconnection OR a late join into an in-progress game,
      // the server sends startGame immediately after joined. If that emit races
      // our `startGame` listener registration it can be lost — and a late joiner,
      // unlike a reconnection, would otherwise be stuck on a default/classic grid
      // (the in-game self-heal only runs once the mode view is mounted, which
      // never happens if gameMode never arrives). Arm the same fallback so a
      // missed startGame is recovered via requestGameState. `requestGameState` is
      // server-guarded by isInProgress, so a stray call during lobby is a no-op.
      if (data.reconnected || data.gameInProgress) {
        // Clear any previous fallback timer to prevent accumulation on rapid reconnects
        if (reconnectFallbackTimerRef.current) {
          clearTimeout(reconnectFallbackTimerRef.current);
          reconnectFallbackTimerRef.current = null;
        }

        const fallbackTimer = setTimeout(() => {
          reconnectFallbackTimerRef.current = null;
          logger.log('[SOCKET.IO] Requesting game state (startGame not received after join/reconnect)');
          socketInstance.emit('requestGameState');
        }, 5000);
        reconnectFallbackTimerRef.current = fallbackTimer;
        // The fallback is cancelled in the main startGame/resetGame handlers below
        // via reconnectFallbackTimerRef — no once() listeners needed, which avoids
        // stale listener accumulation and event interception on rapid reconnects.
      }
    });

    socketInstance.on('updateUsers', (data) => {
      if (data.users) {
        optionsRef.current.onUpdateUsers(data.users);
      }
    });

    socketInstance.on('activeRooms', (data) => {
      optionsRef.current.onActiveRooms(data.rooms || []);
      setRoomsLoading(false);
    });

    socketInstance.on('joinedAsSpectator', (data) => {
      logger.log('[SPECTATOR] Joined as spectator:', data);
      optionsRef.current.onJoinedAsSpectator(data);
      setAttemptingReconnect(false);
    });

    socketInstance.on('spectatorList', (data) => {
      logger.log('[SPECTATOR] Spectator list updated:', data.spectators?.length || 0);
      optionsRef.current.onSpectatorList(data.spectators || []);
    });

    socketInstance.on('spectatorUpgraded', (data) => {
      if (data.success && data.username === optionsRef.current.username) {
        logger.log('[SPECTATOR] Upgraded to player, late join:', data.lateJoin);
        optionsRef.current.onSpectatorUpgraded(data);
      }
    });

    // Fallback: if rooms don't load quickly, stop showing loading state
    const roomsLoadingTimeout = setTimeout(() => {
      setRoomsLoading(false);
    }, SOCKET_CONFIG.ROOMS_LOADING_TIMEOUT);

    socketInstance.on('debugGameStateResponse', (data) => {
      logger.debug('[useMultiplayerSocket] Server game state:', data);
    });

    socketInstance.on('error', (data) => {
      const isErrorLike = data && typeof data === 'object' && ('stack' in data || 'message' in data);
      const errorMessage = data?.message || (typeof data === 'string' ? data : null);
      const errorCode = data?.code;

      const hasNoMeaningfulContent =
        !data ||
        (typeof data === 'object' && Object.keys(data).length === 0) ||
        (isErrorLike && !errorMessage);

      if (hasNoMeaningfulContent) {
        logger.debug('[SOCKET.IO] Received empty error object (internal Socket.IO event)');
        return;
      }

      const errorToCapture = new Error(errorMessage || errorCode || 'Unknown socket error');
      const expected = isExpectedError(errorToCapture);

      // Only send unexpected errors to Sentry; expected ones just log locally
      if (expected) {
        logger.log('[SOCKET.IO] Expected error:', errorMessage || errorCode);
      } else {
        logger.warn('[SOCKET.IO] ❌ Error received:', errorMessage || errorCode || 'Unknown error');
        captureSocketError(errorToCapture, {
          event: 'error',
          gameCode: optionsRef.current.gameCode || undefined,
          socketId: socketInstance.id || undefined,
          username: optionsRef.current.username || undefined,
        });
      }

      if (data?.code === 'GAME_NOT_IN_PROGRESS' || data?.message?.includes('not in progress')) {
        logger.log('[SOCKET.IO] Game state mismatch - querying server for actual state');
        socketInstance.emit('debugGameState');
      }

      // Treat word processing errors as transient — don't bubble as a fatal error
      if (data?.code === 'WORD_PROCESSING_ERROR') {
        logger.log('[SOCKET.IO] Word processing error (transient) — player can retry');
        return;
      }

      optionsRef.current.onError(data);
    });

    socketInstance.on('startGame', (data) => {
      logger.log('[SOCKET.IO] startGame received:', data);
      // Cancel reconnect fallback timer — we got the startGame we were waiting for
      if (reconnectFallbackTimerRef.current) {
        clearTimeout(reconnectFallbackTimerRef.current);
        reconnectFallbackTimerRef.current = null;
      }
      addGameBreadcrumb('game_started', {
        language: data.language,
        timerSeconds: data.timerSeconds,
        gridSize: data.letterGrid?.length,
      });
      optionsRef.current.onGameStart(data);
    });

    socketInstance.on('resetGame', () => {
      logger.log('[SOCKET.IO] Game reset - staying in room for new game');
      // Cancel reconnect fallback timer — game was reset, no need to request state
      if (reconnectFallbackTimerRef.current) {
        clearTimeout(reconnectFallbackTimerRef.current);
        reconnectFallbackTimerRef.current = null;
      }
      optionsRef.current.onGameReset();
    });

    socketInstance.on('hostLeftRoomClosing', (data) => {
      intentionalLeaveRef.current = true;
      // Cancel reconnect fallback — the room is closing, requesting game
      // state would just emit into a dead room.
      if (reconnectFallbackTimerRef.current) {
        clearTimeout(reconnectFallbackTimerRef.current);
        reconnectFallbackTimerRef.current = null;
      }
      const opts = optionsRef.current;
      const resolvedMessage = resolveHostLeftMessage(data, opts.t, 'playerView.roomClosed');
      // Toast is fast feedback the moment the event arrives; the modal in
      // PageClient (HostLeftGraceModal) is the 10s soft cushion + manual exit.
      // PageClient's onExit handler does the URL strip + state reset that the
      // prior 2s `window.location.pathname` reload was doing.
      toast.error(resolvedMessage, {
        icon: '🚪',
        duration: 5000,
      });
      // Clear session immediately so a tab-close / navigation during the modal
      // grace doesn't leave stale rejoin state pointing at a closed room.
      // Modal onExit does its own cleanup — both paths are idempotent.
      clearSessionPreservingUsername(opts.username);
      opts.onHostLeftRoomClosing({ ...data, resolvedMessage });
    });

    socketInstance.on('kicked', (data: { reason: 'host' | 'inactive' }) => {
      intentionalLeaveRef.current = true;
      const opts = optionsRef.current;
      const message = data.reason === 'inactive'
        ? opts.t('hostView.youWereKickedInactive')
        : opts.t('hostView.youWereKicked');
      toast.error(message, { icon: '🚫', duration: 5000 });
      clearSessionPreservingUsername(opts.username);
      opts.onHostLeftRoomClosing({ message });
      // Same as host-left: drop query (?classroom=true) so the lobby renders cleanly.
      kickedReloadTimerRef.current = setTimeout(() => { window.location.href = window.location.pathname; }, 2000);
    });

    socketInstance.on('afkWarning', (data: { secondsRemaining: number }) => {
      const opts = optionsRef.current;
      toast(opts.t('hostView.afkWarning', { seconds: data.secondsRemaining }), {
        icon: '⚠️',
        duration: Math.min(data.secondsRemaining * 1000, 10000),
        id: 'afk-warning',
      });
    });

    socketInstance.on('playerKicked', (data: { username: string; reason: string }) => {
      const opts = optionsRef.current;
      toast(opts.t('hostView.playerKicked', { name: data.username }), {
        icon: '👋',
        duration: 3000,
      });
    });

    socketInstance.on('sessionMigrated', (data) => {
      intentionalLeaveRef.current = true;
      // Cancel reconnect fallback — this session was superseded by another tab.
      if (reconnectFallbackTimerRef.current) {
        clearTimeout(reconnectFallbackTimerRef.current);
        reconnectFallbackTimerRef.current = null;
      }
      logger.log('[SOCKET.IO] Session migrated:', data);
      toast(data.message || 'Your session was moved to another tab', {
        icon: '🔄',
        duration: 5000,
      });
      clearSessionPreservingUsername(optionsRef.current.username);
      optionsRef.current.onSessionMigrated(data);
    });

    socketInstance.on('warning', (data) => {
      logger.warn('[SOCKET.IO] Warning:', data);
      if (data.type === 'persistence') {
        toast.error(
          data.message ||
            'Game state could not be saved. Progress may be lost on server restart.',
          {
            icon: '⚠️',
            duration: 6000,
          }
        );
      } else {
        toast.error(data.message || 'A warning occurred', {
          icon: '⚠️',
          duration: 4000,
        });
      }
      optionsRef.current.onWarning(data);
    });

    socketInstance.on('rateLimited', () => {
      logger.warn('[SOCKET.IO] Rate limited by server');
      const opts = optionsRef.current;
      toast.error(
        opts.t('errors.rateLimited') ||
          'Too many requests. Please wait a moment and try again.',
        {
          icon: '⏳',
          duration: 4000,
        }
      );
      opts.onRateLimited();
    });

    socketInstance.on('hostTransferred', (data) => {
      const opts = optionsRef.current;
      if (data.newHost === opts.username) {
        saveSession({
          gameCode: opts.gameCode,
          username: opts.username,
          isHost: true,
          roomName: opts.roomName || opts.username,
          language: opts.roomLanguage || 'en',
        });
        toast.success(opts.t('hostView.youAreNowHost'), { duration: 5000, icon: '👑' });
      } else {
        // If the previous host was me, clear my stale host session so a later
        // reload/restore doesn't put me back into the host UI.
        if (data.previousHost === opts.username) {
          saveSession({
            gameCode: opts.gameCode,
            username: opts.username,
            isHost: false,
            roomName: opts.roomName || opts.username,
            language: opts.roomLanguage || 'en',
          });
        }
        // Suppress "🔄 X is now the host" — the player roster surfaces the
        // crown badge and the demoted toast was noise on top of the room.
      }
      opts.onHostTransferred(data);
    });

    socketInstance.on('pong', () => {
      // Heartbeat response - connection is alive
    });

    // Client-side heartbeat: send presenceHeartbeat every 20s to keep
    // server health checks from flagging this player as stale.
    // This is especially important on mobile where Socket.IO pings
    // may not be sufficient to detect a live but idle connection.
    // Skip while the tab is hidden — a backgrounded tab shouldn't keep
    // itself "online" indefinitely; handleVisibilityForReconnect below
    // fires an immediate heartbeat the moment focus returns.
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketInstance.connected && document.visibilityState === 'visible') {
        socketInstance.emit('presenceHeartbeat');
      }
    }, 20000);

    // Visibility-change handler: when the tab/app regains focus,
    // check if the socket is still connected and proactively reconnect
    // if it was silently dropped (common on mobile sleep/wake cycles).
    const handleVisibilityForReconnect = () => {
      if (document.visibilityState === 'visible' && socketInstance) {
        if (!socketInstance.connected) {
          logger.log('[SOCKET.IO] Tab became visible — socket disconnected, reconnecting');
          socketInstance.connect();
        } else {
          // Socket is connected — send heartbeat immediately to refresh stale timer
          socketInstance.emit('presenceHeartbeat');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityForReconnect);

    Promise.resolve().then(() => {
      setSocket(socketInstance);
    });

    return () => {
      logger.log('[SOCKET.IO] MultiplayerPage cleaning up');
      clearTimeout(roomsLoadingTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityForReconnect);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (reconnectFallbackTimerRef.current) {
        clearTimeout(reconnectFallbackTimerRef.current);
        reconnectFallbackTimerRef.current = null;
      }
      if (kickedReloadTimerRef.current) {
        clearTimeout(kickedReloadTimerRef.current);
        kickedReloadTimerRef.current = null;
      }
      eventNames.forEach((event) => socketInstance.off(event));
      if (!isReusingSocket) {
        releaseSharedSocket();
      }
    };
  }, []);

  // Host keep-alive
  useEffect(() => {
    if (!isActive || !isHost || !socket || !isConnected) {
      if (hostKeepAliveIntervalRef.current) {
        clearInterval(hostKeepAliveIntervalRef.current);
        hostKeepAliveIntervalRef.current = null;
      }
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket && isConnected) {
        socket.emit('hostReactivate', { gameCode });
      }
    };

    hostKeepAliveIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && socket && isConnected) {
        socket.emit('hostKeepAlive', { gameCode });
      }
    }, SOCKET_CONFIG.HOST_KEEP_ALIVE_INTERVAL);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    socket.emit('hostReactivate', { gameCode });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hostKeepAliveIntervalRef.current) {
        clearInterval(hostKeepAliveIntervalRef.current);
        hostKeepAliveIntervalRef.current = null;
      }
    };
  }, [isActive, isHost, socket, isConnected, gameCode]);

  // Signal that the player intentionally left — prevents auto-rejoin on reconnect
  const signalIntentionalLeave = useCallback(() => {
    intentionalLeaveRef.current = true;
  }, []);

  const refreshRooms = useCallback(() => {
    if (socket && isConnected) {
      setRoomsLoading(true);
      socket.emit('getActiveRooms');
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    roomsLoading,
    attemptingReconnect,
    setAttemptingReconnect,
    setRoomsLoading,
    refreshRooms,
    signalIntentionalLeave,
  };
}

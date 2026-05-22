'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import logger from '@/utils/logger';
import { sanitizeRoomName } from '@/utils/consts';
import { computeReconnectDelay } from '@/utils/reconnectDelay';
import type { LetterGrid, Language, Avatar } from '@/types';

// Socket.IO Context Value Type
export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  /** True only during a planned server restart (deploy) — distinct from a
   *  user-side network drop. Lets the UI show reassuring "updating" copy
   *  instead of an alarming "you went offline" message. Optional so local
   *  context overrides (e.g. the in-game provider) need not supply it. */
  isServerUpdating?: boolean;
  connectionError: string | null;
  getReconnectAttempt: () => number;
  maxReconnectAttempts: number;
  manualReconnect: () => void;
}

// Socket.IO Context
export const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * Detect if we're running inside a native app WebView (Android/iOS).
 * Native apps set a custom user agent or inject a bridge object.
 */
function isMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /LexiClash\/(Android|iOS)/i.test(ua) ||
    !!(window as Record<string, unknown>).__LEXICLASH_NATIVE__
  );
}

/**
 * Detect if user is on a mobile browser (not native app, but mobile Safari/Chrome).
 */
function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !isMobileApp();
}

// Configuration - adaptive for platform
// Mobile gets more aggressive reconnection (network switches are frequent)
// and larger timeouts (cellular latency is higher)
const SOCKET_CONFIG = (() => {
  const mobile = typeof window !== 'undefined' && (isMobileApp() || isMobileBrowser());
  return {
    reconnectionAttempts: mobile ? 30 : 20,         // Mobile: more attempts for network switches
    reconnectionDelay: mobile ? 500 : 1000,          // Mobile: faster initial retry
    reconnectionDelayMax: mobile ? 30000 : 45000,    // Mobile: shorter max (users leave faster)
    timeout: mobile ? 45000 : 30000,                 // Mobile: higher timeout for cellular
    pingInterval: mobile ? 30000 : 25000,            // Mobile: slightly less frequent to save battery
  };
})();

// Shared socket singleton to prevent duplicate connections across components.
// In dev, HMR re-evaluates this module — use globalThis to avoid orphaned sockets.
const HMR_KEY = '__lexiclash_socket__';
const HMR_RC_KEY = '__lexiclash_socket_rc__';

let sharedSocketInstance: Socket | null =
  (typeof globalThis !== 'undefined' && (globalThis as any)[HMR_KEY]) || null;
let sharedSocketRefCount: number =
  (typeof globalThis !== 'undefined' && (globalThis as any)[HMR_RC_KEY]) || 0;

function syncHMR() {
  if (process.env.NODE_ENV === 'development' && typeof globalThis !== 'undefined') {
    (globalThis as any)[HMR_KEY] = sharedSocketInstance;
    (globalThis as any)[HMR_RC_KEY] = sharedSocketRefCount;
  }
}

/**
 * Get the shared socket URL
 */
export const getSocketURL = (): string => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    // Convert ws:// to http:// for Socket.IO
    return process.env.NEXT_PUBLIC_WS_URL.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }

  if (typeof window === 'undefined') return '';

  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
};

/**
 * Get the current Supabase access token (if authenticated)
 */
async function getAuthToken(): Promise<string | undefined> {
  try {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  } catch {
    return undefined;
  }
}

/**
 * Get CrazyGames user token for server-side identity verification.
 * Returns null when not on CrazyGames platform.
 */
async function getCrazyGamesToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || window.__crazyGamesEnvironment !== 'crazygames') return null;
    if (!window.CrazyGames?.SDK) return null;
    const token = await window.CrazyGames.SDK.user.getUserToken();
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Get or create the shared socket instance
 * Uses reference counting to manage cleanup.
 * Passes Supabase JWT in handshake auth for server-side verification.
 */
export function getSharedSocket(): Socket {
  if (!sharedSocketInstance) {
    const socketUrl = getSocketURL();
    logger.log('[SOCKET.IO] Creating shared socket instance:', socketUrl);

    sharedSocketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: SOCKET_CONFIG.reconnectionAttempts,
      reconnectionDelay: SOCKET_CONFIG.reconnectionDelay,
      reconnectionDelayMax: SOCKET_CONFIG.reconnectionDelayMax,
      randomizationFactor: 0.7,  // Higher jitter prevents thundering herd on server restart
      timeout: SOCKET_CONFIG.timeout,
      autoConnect: false, // Connect after setting auth
      forceNew: false,
    });

    // Attach auth tokens before connecting (async but non-blocking)
    Promise.all([getAuthToken(), getCrazyGamesToken()]).then(([token, cgToken]) => {
      if (sharedSocketInstance) {
        sharedSocketInstance.auth = {
          ...(token ? { token } : {}),
          ...(cgToken ? { crazyGamesToken: cgToken } : {}),
        };
      }
      sharedSocketInstance?.connect();
    }).catch(() => {
      // Connect without auth on failure
      sharedSocketInstance?.connect();
    });
  }
  sharedSocketRefCount++;
  syncHMR();
  return sharedSocketInstance;
}

/**
 * Release a reference to the shared socket
 * Socket is cleaned up when all references are released
 */
export function releaseSharedSocket(): void {
  sharedSocketRefCount--;
  if (sharedSocketRefCount <= 0 && sharedSocketInstance) {
    logger.log('[SOCKET.IO] Cleaning up shared socket (no more references)');
    sharedSocketInstance.removeAllListeners();
    sharedSocketInstance.disconnect();
    sharedSocketInstance = null;
    sharedSocketRefCount = 0;
  }
  syncHMR();
}

/**
 * Check if shared socket exists and is connected
 */
export function hasConnectedSharedSocket(): boolean {
  return sharedSocketInstance !== null && sharedSocketInstance.connected;
}

/**
 * Get the shared socket if it exists (without incrementing ref count)
 */
export function getSharedSocketIfExists(): Socket | null {
  return sharedSocketInstance;
}

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * Socket.IO Provider Component
 * Manages the Socket.IO connection lifecycle using shared singleton
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [isServerUpdating, setIsServerUpdating] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    const socketInstance = socketRef.current;
    if (socketInstance && !socketInstance.connected) {
      logger.log('[SOCKET.IO] Manual reconnection triggered');
      reconnectAttemptRef.current = 0;
      setConnectionError(null);
      socketInstance.connect();
    }
  }, []);

  useEffect(() => {
    // Use shared socket singleton
    const socketInstance = getSharedSocket();
    socketRef.current = socketInstance;

    // Connection event handlers
    const handleConnect = () => {
      logger.log('[SOCKET.IO] Connected:', socketInstance.id);
      setIsConnected(true);
      setIsReconnecting(false);
      setIsServerUpdating(false);
      setConnectionError(null);
    };

    const handleDisconnect = (reason: string) => {
      logger.log('[SOCKET.IO] Disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socketInstance.connect();
      }
    };

    const handleConnectError = (error: Error) => {
      // Use log for transient WebSocket errors (they auto-recover via polling fallback)
      // These are common during mobile connections or network hiccups
      // Fixes JAVASCRIPT-NEXTJS-1B and JAVASCRIPT-NEXTJS-1R (transient errors shouldn't spam Sentry)
      const isTransient = error.message === 'websocket error' || error.message === 'timeout';
      if (isTransient) {
        // Use log (not warn) to avoid sending to Sentry - these are expected behaviors
        logger.log('[SOCKET.IO] Connection error (will retry):', error.message);
      } else {
        // Only send non-transient errors to Sentry (truly actionable problems)
        logger.error('[SOCKET.IO] Connection error:', error.message);
      }
      setConnectionError(error.message);
      setIsConnected(false);
      setIsReconnecting(false);
    };

    const handleReconnect = (attemptNumber: number) => {
      logger.log('[SOCKET.IO] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setIsReconnecting(false);
      setIsServerUpdating(false);
      setConnectionError(null);
    };

    const handleReconnectAttempt = (attemptNumber: number) => {
      logger.log('[SOCKET.IO] Reconnection attempt:', attemptNumber);
      setIsReconnecting(true);
      reconnectAttemptRef.current = attemptNumber;

      // Refresh auth token before each reconnection attempt
      // Prevents stale JWT from causing silent guest fallback
      getAuthToken().then(token => {
        if (token && socketInstance) {
          socketInstance.auth = { token };
        }
      }).catch(() => {
        // Continue reconnection without fresh token
      });
    };

    const handleReconnectError = (error: Error) => {
      // Individual reconnection errors are transient - Socket.IO will retry
      // Only log to console (not Sentry) to avoid noise
      logger.log('[SOCKET.IO] Reconnection error:', error.message);
    };

    const handleReconnectFailed = () => {
      // This is a fatal error - user needs to know reconnection completely failed
      logger.error('[SOCKET.IO] Reconnection failed after all attempts');
      setIsReconnecting(false);
      setConnectionError('Failed to reconnect to server');
    };

    const handleServerShutdown = ({
      reconnectIn,
      reconnectJitterMs,
      message,
    }: {
      reconnectIn?: number;
      reconnectJitterMs?: number;
      message?: string;
    }) => {
      logger.log('[SOCKET.IO] Server shutdown notification:', message ?? '(restart)');
      // Planned restart — surface reassuring "updating" UI and show the in-game
      // reconnecting overlay during the wait (a manual disconnect does NOT emit
      // `reconnect_attempt`, so isReconnecting would otherwise stay false and the
      // player would stare at a frozen board).
      setIsServerUpdating(true);
      setIsReconnecting(true);
      socketInstance.disconnect();
      // Per-client jitter spreads the reconnect storm across a window so the
      // freshly-booted single instance isn't hit by every client at once.
      const delay = computeReconnectDelay(reconnectIn, reconnectJitterMs);
      logger.log(`[SOCKET.IO] Reconnecting in ${delay}ms (jittered) after server restart`);
      setTimeout(() => {
        socketInstance.connect();
      }, delay);
    };

    const handleError = (error: unknown) => {
      // Only log non-empty errors to reduce noise
      if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        const code = (error as Record<string, unknown>).code;
        const expectedCodes = [
          'GAME_NOT_FOUND', 'NOT_IN_GAME', 'PLAYER_NOT_IN_GAME', 'ROOM_NOT_FOUND',
          'GAME_NOT_IN_PROGRESS', 'GAME_ALREADY_IN_PROGRESS', 'GAME_ALREADY_STARTED',
          'INTERNAL_ERROR', 'AUTH_REQUIRED',
        ];
        const expectedMessages = [
          'Not in a game', 'You are not in a game', 'Target word already found',
        ];
        const msg = (error as Record<string, unknown>).message;
        if (
          (typeof code === 'string' && expectedCodes.includes(code)) ||
          (typeof msg === 'string' && expectedMessages.includes(msg))
        ) {
          logger.log('[SOCKET.IO] Expected error:', error);
        } else {
          logger.warn('[SOCKET.IO] Socket error event:', JSON.stringify(error));
        }
      }
    };

    // Set up event listeners
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('reconnect', handleReconnect);
    socketInstance.on('reconnect_attempt', handleReconnectAttempt);
    socketInstance.on('reconnect_error', handleReconnectError);
    socketInstance.on('reconnect_failed', handleReconnectFailed);
    socketInstance.on('serverShutdown', handleServerShutdown);
    socketInstance.on('error', handleError);

    // If already connected, update state immediately
    if (socketInstance.connected) {
      setIsConnected(true);
    }

    // Schedule setSocket asynchronously to avoid synchronous setState in effect
    Promise.resolve().then(() => setSocket(socketInstance));

    // Mobile optimization: handle app backgrounding/foregrounding.
    // When the app is backgrounded (tab hidden, app minimized), disconnect the socket
    // to save battery and mobile data. Reconnect when returning to foreground.
    // This is critical for Android WebView where the OS may throttle background timers.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App backgrounded — disconnect after a grace period (user might just be switching tabs briefly)
        bgTimerRef.current = setTimeout(() => {
          // Guard against stale closure: only disconnect if this is still the active socket
          if (socketInstance === socketRef.current && socketInstance.connected) {
            logger.log('[SOCKET.IO] App backgrounded — disconnecting to save resources');
            socketInstance.disconnect();
          }
        }, 5000); // 5s grace period
      } else {
        // App foregrounded — cancel pending disconnect and reconnect if needed
        if (bgTimerRef.current) {
          clearTimeout(bgTimerRef.current);
          bgTimerRef.current = null;
        }
        if (!socketInstance.connected) {
          logger.log('[SOCKET.IO] App foregrounded — reconnecting');
          // Refresh auth token before reconnecting (may have expired while backgrounded)
          getAuthToken().then(token => {
            if (token && socketInstance) {
              socketInstance.auth = { ...socketInstance.auth, token };
            }
            socketInstance.connect();
          }).catch(() => socketInstance.connect());
        }
      }
    };

    // Only add visibility listener on mobile (desktop users expect persistent connections)
    const mobile = isMobileApp() || isMobileBrowser();
    if (mobile) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Handle network status changes (mobile network switches: WiFi→cellular, etc.)
    const handleOnline = () => {
      if (!socketInstance.connected) {
        logger.log('[SOCKET.IO] Network restored — reconnecting');
        socketInstance.connect();
      }
    };

    window.addEventListener('online', handleOnline);

    // Cleanup on unmount
    return () => {
      logger.log('[SOCKET.IO] SocketProvider cleaning up listeners');
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.off('reconnect', handleReconnect);
      socketInstance.off('reconnect_attempt', handleReconnectAttempt);
      socketInstance.off('reconnect_error', handleReconnectError);
      socketInstance.off('reconnect_failed', handleReconnectFailed);
      socketInstance.off('serverShutdown', handleServerShutdown);
      socketInstance.off('error', handleError);
      if (mobile) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (bgTimerRef.current) {
          clearTimeout(bgTimerRef.current);
          bgTimerRef.current = null;
        }
      }
      window.removeEventListener('online', handleOnline);
      releaseSharedSocket();
    };
  }, []);

  // Stable callback that reads from ref — does not change between reconnect attempts
  const getReconnectAttempt = useCallback(() => reconnectAttemptRef.current, []);

  // Memoize the context value to prevent unnecessary re-renders of all consumers.
  // reconnectAttempt state is intentionally excluded: during reconnection (up to 20 attempts)
  // it would cause all consumers to re-render on every attempt. Consumers that need the
  // current attempt number should call getReconnectAttempt() instead (PERF-007).
  const value = useMemo<SocketContextValue>(() => ({
    socket,
    isConnected,
    isReconnecting,
    isServerUpdating,
    connectionError,
    getReconnectAttempt,
    maxReconnectAttempts: SOCKET_CONFIG.reconnectionAttempts,
    manualReconnect
  }), [socket, isConnected, isReconnecting, isServerUpdating, connectionError, getReconnectAttempt, manualReconnect]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access the Socket.IO connection
 * @returns Socket context value
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

/**
 * Optional hook for cases where socket might not be available yet
 * @returns Socket context value or null
 */
export function useSocketOptional(): SocketContextValue | null {
  return useContext(SocketContext);
}

/**
 * Hook to listen to socket events
 * @param event - Event name to listen to
 * @param handler - Event handler function
 */
export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;

    const stableHandler = (data: T) => handlerRef.current(data);
    socket.on(event, stableHandler);

    return () => {
      socket.off(event, stableHandler);
    };
  }, [socket, event]);
}

/**
 * Hook to emit socket events
 * @returns Emit function
 */
export function useSocketEmit() {
  const { socket, isConnected } = useSocket();

  const emit = useCallback((event: string, data: unknown): boolean => {
    if (socket && isConnected) {
      socket.emit(event, data);
      return true;
    }
    logger.warn('[SOCKET.IO] Cannot emit - socket not connected');
    return false;
  }, [socket, isConnected]);

  return emit;
}

export interface GameSocketOperations {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  emit: (event: string, data: unknown) => boolean;
  createGame: (gameCode: string, roomName: string, language: Language, hostUsername: string) => boolean;
  joinGame: (gameCode: string, username: string, playerId: string, avatar: Avatar) => boolean;
  startGame: (letterGrid: LetterGrid, timerSeconds: number, language: Language) => boolean;
  acknowledgeGameStart: (messageId: string) => boolean;
  submitWord: (word: string) => boolean;
  sendChatMessage: (gameCode: string, message: string, isHost: boolean) => boolean;
  endGame: () => boolean;
  resetGame: () => boolean;
  closeRoom: () => boolean;
  validateWords: (validatedScores: unknown) => boolean;
  getActiveRooms: () => boolean;
  hostKeepAlive: () => boolean;
  hostReactivate: () => boolean;
  createTournament: (name: string, totalRounds: number) => boolean;
  getTournamentStandings: () => boolean;
  cancelTournament: () => boolean;
}

/**
 * Hook for game-specific socket operations
 */
export function useGameSocket(): GameSocketOperations {
  const { socket, isConnected, connectionError } = useSocket();
  const emit = useSocketEmit();

  // Keep a ref to emit so all game-operation callbacks can be stable (PERF-008).
  // Without this, every time emit changes (socket reconnect) all 15 callbacks are
  // recreated, causing re-renders in every consumer component.
  const emitRef = useRef(emit);
  useEffect(() => { emitRef.current = emit; }, [emit]);

  // Create game
  const createGame = useCallback((gameCode: string, roomName: string, language: Language, hostUsername: string) => {
    return emitRef.current('createGame', { gameCode, roomName: sanitizeRoomName(roomName), language, hostUsername });
  }, []);

  // Join game
  const joinGame = useCallback((
    gameCode: string,
    username: string,
    playerId: string,
    avatar: Avatar,
    authContext?: { authUserId?: string | null; guestTokenHash?: string | null; guestSessionId?: string | null }
  ) => {
    return emitRef.current('join', { gameCode, username, playerId, avatar, ...authContext });
  }, []);

  // Start game
  const startGame = useCallback((letterGrid: LetterGrid, timerSeconds: number, language: Language) => {
    return emitRef.current('startGame', { letterGrid, timerSeconds, language });
  }, []);

  // Acknowledge game start
  const acknowledgeGameStart = useCallback((messageId: string) => {
    return emitRef.current('startGameAck', { messageId });
  }, []);

  // Submit word
  const submitWord = useCallback((word: string) => {
    return emitRef.current('submitWord', { word });
  }, []);

  // Send chat message
  const sendChatMessage = useCallback((gameCode: string, message: string, isHost: boolean) => {
    return emitRef.current('chatMessage', { gameCode, message, isHost });
  }, []);

  // End game
  const endGame = useCallback(() => {
    return emitRef.current('endGame', {});
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    return emitRef.current('resetGame', {});
  }, []);

  // Close room
  const closeRoom = useCallback(() => {
    return emitRef.current('closeRoom', {});
  }, []);

  // Validate words
  const validateWords = useCallback((validatedScores: unknown) => {
    return emitRef.current('validateWords', { validatedScores });
  }, []);

  // Get active rooms
  const getActiveRooms = useCallback(() => {
    return emitRef.current('getActiveRooms', {});
  }, []);

  // Host keep alive
  const hostKeepAlive = useCallback(() => {
    return emitRef.current('hostKeepAlive', {});
  }, []);

  // Host reactivate
  const hostReactivate = useCallback(() => {
    return emitRef.current('hostReactivate', {});
  }, []);

  // Tournament operations
  const createTournament = useCallback((name: string, totalRounds: number) => {
    return emitRef.current('createTournament', { name, totalRounds });
  }, []);

  const getTournamentStandings = useCallback(() => {
    return emitRef.current('getTournamentStandings', {});
  }, []);

  const cancelTournament = useCallback(() => {
    return emitRef.current('cancelTournament', {});
  }, []);

  return {
    socket,
    isConnected,
    connectionError,
    emit,
    // Game operations
    createGame,
    joinGame,
    startGame,
    acknowledgeGameStart,
    submitWord,
    sendChatMessage,
    endGame,
    resetGame,
    closeRoom,
    validateWords,
    getActiveRooms,
    hostKeepAlive,
    hostReactivate,
    // Tournament operations
    createTournament,
    getTournamentStandings,
    cancelTournament,
  };
}

// ==========================================
// Note: Legacy exports (useWebSocket, useWebSocketOptional, WebSocketContext)
// were removed in v2.0. Use the current exports above instead.
// ==========================================

'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import logger from '@/utils/logger';
import { sanitizeRoomName } from '@/utils/consts';
import type { LetterGrid, Language, Avatar } from '@/types';

// Socket.IO Context Value Type
export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  manualReconnect: () => void;
}

// Socket.IO Context
export const SocketContext = createContext<SocketContextValue | null>(null);

// Configuration - increased for better handling of poor network conditions
const SOCKET_CONFIG = {
  reconnectionAttempts: 20,        // Increased from 10 for poor connections
  reconnectionDelay: 1000,
  reconnectionDelayMax: 45000,     // Increased from 30000 for longer grace period
  timeout: 30000,                  // Increased from 20000 for slow connections
};

// Shared socket singleton to prevent duplicate connections across components
let sharedSocketInstance: Socket | null = null;
let sharedSocketRefCount = 0;

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
 * Get or create the shared socket instance
 * Uses reference counting to manage cleanup
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
      timeout: SOCKET_CONFIG.timeout,
      autoConnect: true,
      forceNew: false,
    });
  }
  sharedSocketRefCount++;
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    const socketInstance = socketRef.current;
    if (socketInstance && !socketInstance.connected) {
      logger.log('[SOCKET.IO] Manual reconnection triggered');
      setReconnectAttempt(0);
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
      setConnectionError(null);
    };

    const handleReconnectAttempt = (attemptNumber: number) => {
      logger.log('[SOCKET.IO] Reconnection attempt:', attemptNumber);
      setIsReconnecting(true);
      setReconnectAttempt(attemptNumber);
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

    const handleServerShutdown = ({ reconnectIn, message }: { reconnectIn?: number; message: string }) => {
      logger.log('[SOCKET.IO] Server shutdown notification:', message);
      socketInstance.disconnect();
      setTimeout(() => {
        logger.log('[SOCKET.IO] Attempting reconnection after server restart');
        socketInstance.connect();
      }, reconnectIn || 5000);
    };

    const handleError = (error: unknown) => {
      // Only log non-empty errors to reduce noise
      if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        logger.error('[SOCKET.IO] Socket error event:', error);
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
      releaseSharedSocket();
    };
  }, []);

  // Memoize the context value to prevent unnecessary re-renders of all consumers
  // This is critical - Socket.IO state changes frequently but consumers may not care about all changes
  const value = useMemo<SocketContextValue>(() => ({
    socket,
    isConnected,
    isReconnecting,
    connectionError,
    reconnectAttempt,
    maxReconnectAttempts: SOCKET_CONFIG.reconnectionAttempts,
    manualReconnect
  }), [socket, isConnected, isReconnecting, connectionError, reconnectAttempt, manualReconnect]);

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

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
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

  // Create game
  const createGame = useCallback((gameCode: string, roomName: string, language: Language, hostUsername: string) => {
    return emit('createGame', { gameCode, roomName: sanitizeRoomName(roomName), language, hostUsername });
  }, [emit]);

  // Join game
  const joinGame = useCallback((
    gameCode: string,
    username: string,
    playerId: string,
    avatar: Avatar,
    authContext?: { authUserId?: string | null; guestTokenHash?: string | null; guestSessionId?: string | null }
  ) => {
    return emit('join', { gameCode, username, playerId, avatar, ...authContext });
  }, [emit]);

  // Start game
  const startGame = useCallback((letterGrid: LetterGrid, timerSeconds: number, language: Language) => {
    return emit('startGame', { letterGrid, timerSeconds, language });
  }, [emit]);

  // Acknowledge game start
  const acknowledgeGameStart = useCallback((messageId: string) => {
    return emit('startGameAck', { messageId });
  }, [emit]);

  // Submit word
  const submitWord = useCallback((word: string) => {
    return emit('submitWord', { word });
  }, [emit]);

  // Send chat message
  const sendChatMessage = useCallback((gameCode: string, message: string, isHost: boolean) => {
    return emit('chatMessage', { gameCode, message, isHost });
  }, [emit]);

  // End game
  const endGame = useCallback(() => {
    return emit('endGame', {});
  }, [emit]);

  // Reset game
  const resetGame = useCallback(() => {
    return emit('resetGame', {});
  }, [emit]);

  // Close room
  const closeRoom = useCallback(() => {
    return emit('closeRoom', {});
  }, [emit]);

  // Validate words
  const validateWords = useCallback((validatedScores: unknown) => {
    return emit('validateWords', { validatedScores });
  }, [emit]);

  // Get active rooms
  const getActiveRooms = useCallback(() => {
    return emit('getActiveRooms', {});
  }, [emit]);

  // Host keep alive
  const hostKeepAlive = useCallback(() => {
    return emit('hostKeepAlive', {});
  }, [emit]);

  // Host reactivate
  const hostReactivate = useCallback(() => {
    return emit('hostReactivate', {});
  }, [emit]);

  // Tournament operations
  const createTournament = useCallback((name: string, totalRounds: number) => {
    return emit('createTournament', { name, totalRounds });
  }, [emit]);

  const getTournamentStandings = useCallback(() => {
    return emit('getTournamentStandings', {});
  }, [emit]);

  const cancelTournament = useCallback(() => {
    return emit('cancelTournament', {});
  }, [emit]);

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

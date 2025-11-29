'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import logger from '@/utils/logger';
import type { LetterGrid, Language, Avatar } from '@/types';

// Socket.IO Context Value Type
export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

// Socket.IO Context
export const SocketContext = createContext<SocketContextValue | null>(null);

// Configuration
const SOCKET_CONFIG = {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  timeout: 20000,
};

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * Socket.IO Provider Component
 * Manages the Socket.IO connection lifecycle
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get the WebSocket URL from environment or construct it
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:3001');

    // Create Socket.IO client
    const socketInstance = io(wsHost, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: SOCKET_CONFIG.reconnectionAttempts,
      reconnectionDelay: SOCKET_CONFIG.reconnectionDelay,
      reconnectionDelayMax: SOCKET_CONFIG.reconnectionDelayMax,
      timeout: SOCKET_CONFIG.timeout,
      autoConnect: true,
      forceNew: false,
    });

    socketRef.current = socketInstance;

    // Connection event handlers
    socketInstance.on('connect', () => {
      logger.log('[SOCKET.IO] Connected:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('disconnect', (reason: string) => {
      logger.log('[SOCKET.IO] Disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error: Error) => {
      logger.error('[SOCKET.IO] Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber: number) => {
      logger.log('[SOCKET.IO] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber: number) => {
      logger.log('[SOCKET.IO] Reconnection attempt:', attemptNumber);
    });

    socketInstance.on('reconnect_error', (error: Error) => {
      logger.error('[SOCKET.IO] Reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      logger.error('[SOCKET.IO] Reconnection failed after all attempts');
      setConnectionError('Failed to reconnect to server');
    });

    // Handle server shutdown notification (for zero-downtime deployments)
    socketInstance.on('serverShutdown', ({ reconnectIn, message }: { reconnectIn?: number; message: string }) => {
      logger.log('[SOCKET.IO] Server shutdown notification:', message);
      // Disconnect gracefully and schedule reconnection
      socketInstance.disconnect();
      setTimeout(() => {
        logger.log('[SOCKET.IO] Attempting reconnection after server restart');
        socketInstance.connect();
      }, reconnectIn || 5000);
    });

    // Catch any unhandled error events
    socketInstance.on('error', (error: unknown) => {
      logger.error('[SOCKET.IO] Socket error event:', error);
      // Log additional context if error is empty
      if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
        logger.error('[SOCKET.IO] Received empty error - checking socket state');
        logger.error('[SOCKET.IO] Connected:', socketInstance.connected);
        logger.error('[SOCKET.IO] ID:', socketInstance.id);
      }
    });

    // Schedule setSocket asynchronously to avoid synchronous setState in effect
    Promise.resolve().then(() => setSocket(socketInstance));

    // Cleanup on unmount
    return () => {
      logger.log('[SOCKET.IO] Cleaning up socket connection');
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
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
    return emit('createGame', { gameCode, roomName, language, hostUsername });
  }, [emit]);

  // Join game
  const joinGame = useCallback((gameCode: string, username: string, playerId: string, avatar: Avatar) => {
    return emit('join', { gameCode, username, playerId, avatar });
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

// Legacy compatibility - export useWebSocket as alias
export const useWebSocket = (): Socket | null => {
  const { socket } = useSocket();
  return socket;
};

export const useWebSocketOptional = (): Socket | null => {
  const context = useContext(SocketContext);
  return context?.socket || null;
};

// Legacy WebSocketContext export for backwards compatibility
export const WebSocketContext = SocketContext;

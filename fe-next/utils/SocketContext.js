'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// Socket.IO Context
export const SocketContext = createContext(null);

// Configuration
const SOCKET_CONFIG = {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  timeout: 20000,
};

/**
 * Socket.IO Provider Component
 * Manages the Socket.IO connection lifecycle
 */
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);

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
      console.log('[SOCKET.IO] Connected:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[SOCKET.IO] Disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[SOCKET.IO] Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[SOCKET.IO] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('[SOCKET.IO] Reconnection attempt:', attemptNumber);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('[SOCKET.IO] Reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('[SOCKET.IO] Reconnection failed after all attempts');
      setConnectionError('Failed to reconnect to server');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('[SOCKET.IO] Cleaning up socket connection');
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
 * @returns {{ socket: Socket, isConnected: boolean, connectionError: string | null }}
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

/**
 * Optional hook for cases where socket might not be available yet
 * @returns {{ socket: Socket | null, isConnected: boolean, connectionError: string | null } | null}
 */
export function useSocketOptional() {
  return useContext(SocketContext);
}

/**
 * Hook to listen to socket events
 * @param {string} event - Event name to listen to
 * @param {function} handler - Event handler function
 */
export function useSocketEvent(event, handler) {
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
 * @returns {function} - Emit function
 */
export function useSocketEmit() {
  const { socket, isConnected } = useSocket();

  const emit = useCallback((event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
      return true;
    }
    console.warn('[SOCKET.IO] Cannot emit - socket not connected');
    return false;
  }, [socket, isConnected]);

  return emit;
}

/**
 * Hook for game-specific socket operations
 */
export function useGameSocket() {
  const { socket, isConnected, connectionError } = useSocket();
  const emit = useSocketEmit();

  // Create game
  const createGame = useCallback((gameCode, roomName, language, hostUsername) => {
    return emit('createGame', { gameCode, roomName, language, hostUsername });
  }, [emit]);

  // Join game
  const joinGame = useCallback((gameCode, username, playerId, avatar) => {
    return emit('join', { gameCode, username, playerId, avatar });
  }, [emit]);

  // Start game
  const startGame = useCallback((letterGrid, timerSeconds, language) => {
    return emit('startGame', { letterGrid, timerSeconds, language });
  }, [emit]);

  // Acknowledge game start
  const acknowledgeGameStart = useCallback((messageId) => {
    return emit('startGameAck', { messageId });
  }, [emit]);

  // Submit word
  const submitWord = useCallback((word) => {
    return emit('submitWord', { word });
  }, [emit]);

  // Send chat message
  const sendChatMessage = useCallback((gameCode, message, isHost) => {
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
  const validateWords = useCallback((validatedScores) => {
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
  const createTournament = useCallback((name, totalRounds) => {
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
export const useWebSocket = () => {
  const { socket } = useSocket();
  return socket;
};

export const useWebSocketOptional = () => {
  const context = useContext(SocketContext);
  return context?.socket || null;
};

// Legacy WebSocketContext export for backwards compatibility
export const WebSocketContext = SocketContext;

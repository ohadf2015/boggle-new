// Socket.IO context - adapted from fe-next/utils/SocketContext.js
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { SOCKET_CONFIG } from '../constants/game';

// Get WebSocket URL from environment or use default
const getWsUrl = (): string => {
  // Use environment variable with fallback to localhost for development
  // In production: EXPO_PUBLIC_API_URL should be set to server URL
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('[Socket] Using API URL:', apiUrl);
  return apiUrl;
};

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
  reconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  const createSocket = useCallback(() => {
    const wsUrl = getWsUrl();
    console.log('[Socket] Connecting to:', wsUrl);

    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: SOCKET_CONFIG.reconnectionAttempts,
      reconnectionDelay: SOCKET_CONFIG.reconnectionDelay,
      reconnectionDelayMax: SOCKET_CONFIG.reconnectionDelayMax,
      timeout: SOCKET_CONFIG.timeout,
      autoConnect: true,
      forceNew: false,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after max attempts');
      setConnectionError('Failed to reconnect to server');
    });

    return newSocket;
  }, []);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  }, [socket]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        console.log('[Socket] App came to foreground, checking connection...');
        if (socket && !socket.connected) {
          console.log('[Socket] Reconnecting...');
          socket.connect();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [socket]);

  // Initialize socket on mount
  useEffect(() => {
    const newSocket = createSocket();
    setSocket(newSocket);

    return () => {
      console.log('[Socket] Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [createSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook for socket events
export function useSocketEvent<T = any>(
  eventName: string,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [socket, eventName, ...deps]);
}

// Custom hook for emitting socket events
export function useSocketEmit() {
  const { socket, isConnected } = useSocket();

  const emit = useCallback(
    (eventName: string, data?: any) => {
      if (!socket || !isConnected) {
        console.warn('[Socket] Cannot emit, not connected');
        return false;
      }
      socket.emit(eventName, data);
      return true;
    },
    [socket, isConnected]
  );

  return emit;
}

// Game-specific socket operations hook
export function useGameSocket() {
  const { socket, isConnected } = useSocket();
  const emit = useSocketEmit();

  // Create game
  const createGame = useCallback((data: {
    gameCode: string;
    roomName: string;
    language: string;
    hostUsername: string;
    playerId?: string;
    avatar?: any;
    authUserId?: string;
    guestTokenHash?: string;
    isRanked?: boolean;
    profilePictureUrl?: string;
  }) => {
    return emit('createGame', data);
  }, [emit]);

  // Join game
  const joinGame = useCallback((data: {
    gameCode: string;
    username: string;
    playerId?: string;
    avatar?: any;
    authUserId?: string;
    guestTokenHash?: string;
    profilePictureUrl?: string;
  }) => {
    return emit('join', data);
  }, [emit]);

  // Start game
  const startGame = useCallback((data: {
    letterGrid: string[][];
    timerSeconds: number;
    language: string;
    minWordLength?: number;
  }) => {
    return emit('startGame', data);
  }, [emit]);

  // Acknowledge game start
  const acknowledgeGameStart = useCallback((messageId: string) => {
    return emit('startGameAck', { messageId });
  }, [emit]);

  // Submit word
  const submitWord = useCallback((word: string, comboLevel: number = 0) => {
    return emit('submitWord', { word, comboLevel });
  }, [emit]);

  // Send chat message
  const sendChatMessage = useCallback((message: string, gameCode: string) => {
    return emit('chatMessage', { message, gameCode });
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

  // Validate words (host only)
  const validateWords = useCallback((validations: Array<{ word: string; isValid: boolean }>) => {
    return emit('validateWords', { validations });
  }, [emit]);

  // Get active rooms
  const getActiveRooms = useCallback(() => {
    return emit('getActiveRooms', {});
  }, [emit]);

  // Leave room
  const leaveRoom = useCallback((gameCode: string, username: string) => {
    return emit('leaveRoom', { gameCode, username });
  }, [emit]);

  // Ping/Pong for connection health
  const ping = useCallback(() => {
    return emit('ping', {});
  }, [emit]);

  return {
    socket,
    isConnected,
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
    leaveRoom,
    ping,
  };
}

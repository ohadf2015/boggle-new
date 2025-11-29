// useGameState - Custom hook for game state management
// Manages game room state, player lists, and game flow
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Player {
  id: string;
  username: string;
  score?: number;
  words?: string[];
  avatarEmoji?: string;
  avatarColor?: string;
  isHost?: boolean;
  isReady?: boolean;
}

export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'master';
  timerDuration: number;
  language: 'en' | 'he' | 'sv' | 'ja';
  maxPlayers?: number;
}

export interface GameState {
  // Room info
  roomCode: string | null;
  isHost: boolean;

  // Players
  players: Player[];
  currentPlayer: Player | null;

  // Game state
  gamePhase: 'lobby' | 'starting' | 'playing' | 'validating' | 'results' | 'ended';
  grid: string[][];
  timeRemaining: number;

  // Settings
  settings: GameSettings;

  // Words
  myWords: string[];
  allWords: Record<string, string[]>; // playerId -> words

  // Achievements
  achievements: any[];
}

const STORAGE_KEY = 'lexiclash_game_session';

const defaultSettings: GameSettings = {
  difficulty: 'medium',
  timerDuration: 180, // 3 minutes
  language: 'he',
  maxPlayers: 8,
};

export function useGameState() {
  const { socket, isConnected } = useSocket();
  const [state, setState] = useState<GameState>({
    roomCode: null,
    isHost: false,
    players: [],
    currentPlayer: null,
    gamePhase: 'lobby',
    grid: [],
    timeRemaining: 0,
    settings: defaultSettings,
    myWords: [],
    allWords: {},
    achievements: [],
  });

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const session = JSON.parse(saved);
          setState((prev) => ({
            ...prev,
            roomCode: session.roomCode,
            isHost: session.isHost,
            currentPlayer: session.currentPlayer,
          }));
        }
      } catch (error) {
        console.error('[GameState] Failed to load session:', error);
      }
    };
    loadSession();
  }, []);

  // Save session when important values change
  useEffect(() => {
    const saveSession = async () => {
      try {
        const session = {
          roomCode: state.roomCode,
          isHost: state.isHost,
          currentPlayer: state.currentPlayer,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('[GameState] Failed to save session:', error);
      }
    };
    if (state.roomCode) {
      saveSession();
    }
  }, [state.roomCode, state.isHost, state.currentPlayer]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Player list updates
    const handleUpdateUsers = (data: { users: Player[] }) => {
      setState((prev) => ({
        ...prev,
        players: data.users || [],
      }));
    };

    // Game started
    const handleGameStarted = (data: { grid: string[][]; timerDuration: number; settings: GameSettings }) => {
      setState((prev) => ({
        ...prev,
        gamePhase: 'playing',
        grid: data.grid,
        timeRemaining: data.timerDuration,
        settings: { ...prev.settings, ...data.settings },
      }));

      // Start countdown timer
      startTimer(data.timerDuration);
    };

    // Game over
    const handleGameOver = () => {
      setState((prev) => ({
        ...prev,
        gamePhase: 'validating',
      }));
      stopTimer();
    };

    // Scores received (after validation)
    const handleScores = (data: { players: Player[]; words: Record<string, string[]> }) => {
      setState((prev) => ({
        ...prev,
        gamePhase: 'results',
        players: data.players,
        allWords: data.words,
      }));
    };

    // Word submitted by another player
    const handleWordSubmitted = (data: { playerId: string; word: string }) => {
      setState((prev) => {
        const allWords = { ...prev.allWords };
        if (!allWords[data.playerId]) {
          allWords[data.playerId] = [];
        }
        allWords[data.playerId].push(data.word);
        return { ...prev, allWords };
      });
    };

    // Achievement unlocked
    const handleAchievement = (achievement: any) => {
      setState((prev) => ({
        ...prev,
        achievements: [...prev.achievements, achievement],
      }));
    };

    // Room closed
    const handleRoomClosed = () => {
      resetGame();
    };

    // Attach listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('gameStarted', handleGameStarted);
    socket.on('gameOver', handleGameOver);
    socket.on('scores', handleScores);
    socket.on('wordSubmitted', handleWordSubmitted);
    socket.on('achievement', handleAchievement);
    socket.on('roomClosed', handleRoomClosed);

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('gameStarted', handleGameStarted);
      socket.off('gameOver', handleGameOver);
      socket.off('scores', handleScores);
      socket.off('wordSubmitted', handleWordSubmitted);
      socket.off('achievement', handleAchievement);
      socket.off('roomClosed', handleRoomClosed);
    };
  }, [socket, isConnected]);

  // Timer management
  const startTimer = (duration: number) => {
    stopTimer(); // Clear any existing timer

    let remaining = duration;
    setState((prev) => ({ ...prev, timeRemaining: remaining }));

    timerIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setState((prev) => ({ ...prev, timeRemaining: remaining }));

      if (remaining <= 0) {
        stopTimer();
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Actions
  const createRoom = useCallback(
    (username: string, settings?: Partial<GameSettings>) => {
      if (!socket || !isConnected) {
        console.warn('[GameState] Cannot create room: not connected');
        return;
      }

      socket.emit('createGame', {
        username,
        settings: { ...defaultSettings, ...settings },
      });

      setState((prev) => ({
        ...prev,
        isHost: true,
        currentPlayer: { id: socket.id || '', username },
      }));
    },
    [socket, isConnected]
  );

  const joinRoom = useCallback(
    (roomCode: string, username: string) => {
      if (!socket || !isConnected) {
        console.warn('[GameState] Cannot join room: not connected');
        return;
      }

      socket.emit('join', { code: roomCode, username });

      setState((prev) => ({
        ...prev,
        roomCode,
        isHost: false,
        currentPlayer: { id: socket.id || '', username },
      }));
    },
    [socket, isConnected]
  );

  const startGame = useCallback(() => {
    if (!socket || !state.isHost) return;
    socket.emit('startGame', { code: state.roomCode });
  }, [socket, state.isHost, state.roomCode]);

  const submitWord = useCallback(
    (word: string) => {
      if (!socket) return;

      socket.emit('submitWord', {
        code: state.roomCode,
        word,
      });

      setState((prev) => ({
        ...prev,
        myWords: [...prev.myWords, word],
      }));
    },
    [socket, state.roomCode]
  );

  const submitAllWords = useCallback(() => {
    if (!socket) return;

    socket.emit('sendAnswer', {
      code: state.roomCode,
      words: state.myWords,
    });
  }, [socket, state.roomCode, state.myWords]);

  const leaveRoom = useCallback(() => {
    if (socket && state.roomCode) {
      socket.emit('leaveRoom', { code: state.roomCode });
    }
    resetGame();
  }, [socket, state.roomCode]);

  const resetGame = useCallback(() => {
    stopTimer();
    setState({
      roomCode: null,
      isHost: false,
      players: [],
      currentPlayer: null,
      gamePhase: 'lobby',
      grid: [],
      timeRemaining: 0,
      settings: defaultSettings,
      myWords: [],
      allWords: {},
      achievements: [],
    });
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  return {
    // State
    ...state,

    // Actions
    createRoom,
    joinRoom,
    startGame,
    submitWord,
    submitAllWords,
    leaveRoom,
    resetGame,
  };
}

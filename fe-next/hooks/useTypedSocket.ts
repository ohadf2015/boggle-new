/**
 * useTypedSocket - Type-safe Socket.IO hook
 *
 * Provides strongly-typed socket event handling with automatic
 * cleanup, error tracking, and reconnection support.
 *
 * Features:
 * - Full TypeScript support for all socket events
 * - Automatic event listener cleanup on unmount
 * - Integration with error monitoring
 * - Memoized emit functions
 * - Connection state tracking
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '@/utils/SocketContext';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@/shared/constants/socketEvents';
import { trackSocketError, trackGameEvent } from '@/utils/errorMonitoring';
import type {
  Language,
  DifficultyLevel,
  LetterGrid,
  Avatar,
  GridPosition,
  LeaderboardEntry,
  WordDetail,
  GameUser,
} from '@/shared/types/game';

// ==========================================
// Event Payload Types (Client → Server)
// ==========================================

export interface CreateGamePayload {
  gameCode: string;
  roomName?: string;
  language?: Language;
  hostUsername?: string;
  playerId?: string | null;
  avatar?: Avatar;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  isRanked?: boolean;
  profilePictureUrl?: string | null;
}

export interface JoinGamePayload {
  gameCode: string;
  username: string;
  playerId?: string | null;
  avatar?: Avatar;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  profilePictureUrl?: string | null;
}

export interface StartGamePayload {
  gameCode?: string;
  letterGrid: LetterGrid;
  timerSeconds?: number;
  language?: Language;
  difficulty?: DifficultyLevel;
  minWordLength?: number;
}

export interface SubmitWordPayload {
  gameCode?: string;
  username?: string;
  word: string;
  path?: GridPosition[];
  comboLevel?: number;
}

export interface ChatMessagePayload {
  gameCode?: string;
  username?: string;
  message: string;
}

export interface BotPayload {
  gameCode?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  botId?: string;
  botUsername?: string;
  username?: string;
}

export interface TournamentPayload {
  gameCode?: string;
  name?: string;
  totalRounds?: number;
  settings?: {
    timerSeconds?: number;
    difficulty?: DifficultyLevel;
    minWordLength?: number;
  };
}

export interface PresencePayload {
  gameCode?: string;
  username?: string;
  status?: 'active' | 'idle' | 'afk';
  isWindowFocused?: boolean;
  lastActivityAt?: number;
  timestamp?: number;
}

export interface HostActionPayload {
  gameCode: string;
  username?: string;
  newHostUsername?: string;
  settings?: {
    timerSeconds?: number;
    difficulty?: DifficultyLevel;
    minWordLength?: number;
    language?: Language;
  };
}

export interface VotePayload {
  gameCode?: string;
  word: string;
  voteType?: 'valid' | 'invalid';
  isValid?: boolean;
  language?: Language;
  submittedBy?: string;
  isBot?: boolean;
}

export interface ReconnectPayload {
  gameCode: string;
  username: string;
  authUserId?: string | null;
  guestTokenHash?: string | null;
}

// ==========================================
// Event Payload Types (Server → Client)
// ==========================================

export interface JoinedPayload {
  gameCode: string;
  users: Record<string, GameUser>;
  gameState: string;
  hostUsername: string;
  isHost: boolean;
  language: Language;
  roomName: string;
  letterGrid?: LetterGrid;
  remainingTime?: number;
  minWordLength?: number;
  tournamentData?: {
    id: string;
    name: string;
    currentRound: number;
    totalRounds: number;
  };
}

export interface ErrorPayload {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface StartGameBroadcastPayload {
  letterGrid: LetterGrid;
  timerSeconds: number;
  language: Language;
  difficulty: DifficultyLevel;
  minWordLength: number;
  messageId?: string;
}

export interface WordAcceptedPayload {
  word: string;
  score: number;
  comboLevel: number;
  comboBonus: number;
  autoValidated: boolean;
  path?: GridPosition[];
}

export interface WordRejectedPayload {
  word: string;
  reason: string;
}

export interface FinalScoresPayload {
  scores: Array<{
    username: string;
    score: number;
    totalScore: number;
    wordCount: number;
    allWords: WordDetail[];
    achievements: string[];
    avatar: Avatar;
    isBot: boolean;
  }>;
  gameLanguage: Language;
  tournamentData?: {
    id: string;
    currentRound: number;
    totalRounds: number;
    standings: Array<{
      rank: number;
      username: string;
      avatar: Avatar;
      totalScore: number;
      roundScores: number[];
    }>;
  };
}

export interface XpGainedPayload {
  totalXp: number;
  breakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
}

export interface LevelUpPayload {
  oldLevel: number;
  newLevel: number;
  newTitles: string[];
}

export interface AchievementPayload {
  key: string;
  icon: string;
}

export interface PlayerPresencePayload {
  username: string;
  status: 'active' | 'idle' | 'afk';
  isWindowFocused?: boolean;
}

export interface ChatMessageBroadcastPayload {
  username: string;
  message: string;
  timestamp: number;
  avatar?: Avatar;
}

// ==========================================
// Server Event Handler Types
// ==========================================

export interface ServerEventHandlers {
  [SERVER_EVENTS.JOINED]?: (payload: JoinedPayload) => void;
  [SERVER_EVENTS.ERROR]?: (payload: ErrorPayload) => void;
  [SERVER_EVENTS.RATE_LIMITED]?: () => void;
  [SERVER_EVENTS.WARNING]?: (payload: { message: string }) => void;
  [SERVER_EVENTS.SERVER_SHUTDOWN]?: (payload: { reason: string }) => void;

  [SERVER_EVENTS.UPDATE_USERS]?: (payload: { users: Record<string, GameUser> }) => void;
  [SERVER_EVENTS.START_GAME]?: (payload: StartGameBroadcastPayload) => void;
  [SERVER_EVENTS.END_GAME]?: (payload: { reason: string }) => void;
  [SERVER_EVENTS.RESET_GAME]?: () => void;
  [SERVER_EVENTS.TIME_UPDATE]?: (payload: { remainingTime: number }) => void;
  [SERVER_EVENTS.SHUFFLING_GRID_UPDATE]?: (payload: { gridState: LetterGrid }) => void;

  [SERVER_EVENTS.WORD_ACCEPTED]?: (payload: WordAcceptedPayload) => void;
  [SERVER_EVENTS.WORD_REJECTED]?: (payload: WordRejectedPayload) => void;
  [SERVER_EVENTS.WORD_ALREADY_FOUND]?: (payload: { word: string }) => void;
  [SERVER_EVENTS.WORD_NOT_ON_BOARD]?: (payload: { word: string }) => void;
  [SERVER_EVENTS.WORD_TOO_SHORT]?: (payload: { word: string; minLength: number }) => void;
  [SERVER_EVENTS.WORD_NEEDS_VALIDATION]?: (payload: { word: string }) => void;
  [SERVER_EVENTS.WORD_VALIDATING_WITH_AI]?: (payload: { word: string }) => void;
  [SERVER_EVENTS.WORD_BECAME_VALID]?: (payload: { word: string; score: number }) => void;
  [SERVER_EVENTS.VALIDATION_COMPLETE]?: (payload: { scores: unknown[] }) => void;

  [SERVER_EVENTS.UPDATE_LEADERBOARD]?: (payload: { leaderboard: LeaderboardEntry[] }) => void;
  [SERVER_EVENTS.LEADERBOARD_UPDATE]?: (payload: { leaderboard: LeaderboardEntry[] }) => void;
  [SERVER_EVENTS.VALIDATED_SCORES]?: (payload: { scores: unknown[] }) => void;
  [SERVER_EVENTS.FINAL_SCORES]?: (payload: FinalScoresPayload) => void;

  [SERVER_EVENTS.LIVE_ACHIEVEMENT_UNLOCKED]?: (payload: AchievementPayload) => void;
  [SERVER_EVENTS.ACHIEVEMENT_UNLOCKED]?: (payload: { achievements: string[] }) => void;
  [SERVER_EVENTS.XP_GAINED]?: (payload: XpGainedPayload) => void;
  [SERVER_EVENTS.LEVEL_UP]?: (payload: LevelUpPayload) => void;

  [SERVER_EVENTS.CHAT_MESSAGE]?: (payload: ChatMessageBroadcastPayload) => void;
  [SERVER_EVENTS.CHAT_HISTORY]?: (payload: { messages: ChatMessageBroadcastPayload[] }) => void;

  [SERVER_EVENTS.PLAYER_PRESENCE_UPDATE]?: (payload: PlayerPresencePayload) => void;
  [SERVER_EVENTS.PLAYER_DISCONNECTED]?: (payload: { username: string }) => void;
  [SERVER_EVENTS.PLAYER_RECONNECTED]?: (payload: { username: string }) => void;
  [SERVER_EVENTS.PLAYER_LEFT]?: (payload: { username: string }) => void;
  [SERVER_EVENTS.PLAYER_JOINED_LATE]?: (payload: { username: string; avatar: Avatar }) => void;
  [SERVER_EVENTS.PLAYER_FOUND_WORD]?: (payload: { username: string; word: string }) => void;

  [SERVER_EVENTS.HOST_DISCONNECTED]?: (payload: { username: string }) => void;
  [SERVER_EVENTS.HOST_TRANSFERRED]?: (payload: { newHost: string }) => void;
  [SERVER_EVENTS.HOST_LEFT_ROOM_CLOSING]?: () => void;

  [SERVER_EVENTS.BOT_ADDED]?: (payload: { bot: GameUser }) => void;
  [SERVER_EVENTS.BOT_REMOVED]?: (payload: { botUsername: string }) => void;

  [SERVER_EVENTS.TOURNAMENT_CREATED]?: (payload: { id: string; name: string; totalRounds: number }) => void;
  [SERVER_EVENTS.TOURNAMENT_ROUND_STARTING]?: (payload: { round: number; totalRounds: number }) => void;
  [SERVER_EVENTS.TOURNAMENT_ROUND_COMPLETED]?: (payload: { round: number; standings: unknown[] }) => void;
  [SERVER_EVENTS.TOURNAMENT_COMPLETE]?: (payload: { winner: string; standings: unknown[] }) => void;
  [SERVER_EVENTS.TOURNAMENT_CANCELLED]?: () => void;

  [SERVER_EVENTS.ACTIVE_ROOMS]?: (payload: { rooms: unknown[] }) => void;
}

// ==========================================
// Hook Options
// ==========================================

export interface UseTypedSocketOptions {
  gameCode?: string;
  handlers?: ServerEventHandlers;
  enabled?: boolean;
  trackErrors?: boolean;
}

// ==========================================
// Hook Return Type
// ==========================================

export interface UseTypedSocketReturn {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;

  // Game lifecycle
  createGame: (payload: CreateGamePayload) => void;
  joinGame: (payload: JoinGamePayload) => void;
  startGame: (payload: StartGamePayload) => void;
  resetGame: (gameCode?: string) => void;
  closeRoom: (gameCode: string) => void;
  leaveRoom: (gameCode: string, username: string) => void;
  reconnect: (payload: ReconnectPayload) => void;

  // Word submission
  submitWord: (payload: SubmitWordPayload) => void;
  submitWordVote: (payload: VotePayload) => void;
  submitPeerVote: (payload: VotePayload) => void;

  // Chat
  sendChatMessage: (payload: ChatMessagePayload) => void;

  // Bots
  addBot: (payload: BotPayload) => void;
  removeBot: (payload: BotPayload) => void;

  // Tournament
  createTournament: (payload: TournamentPayload) => void;
  startTournamentRound: () => void;
  cancelTournament: () => void;

  // Presence
  sendHeartbeat: (payload: PresencePayload) => void;
  updatePresence: (payload: PresencePayload) => void;
  updateWindowFocus: (gameCode: string, isFocused: boolean) => void;

  // Host actions
  kickPlayer: (payload: HostActionPayload) => void;
  transferHost: (payload: HostActionPayload) => void;
  updateSettings: (payload: HostActionPayload) => void;

  // Misc
  getActiveRooms: () => void;
  getWordsForBoard: (language: Language, boardSize?: { rows: number; cols: number }) => void;

  // Raw emit for custom events
  emit: <T = unknown>(event: string, data?: T) => void;
}

// ==========================================
// Hook Implementation
// ==========================================

export function useTypedSocket(options: UseTypedSocketOptions = {}): UseTypedSocketReturn {
  const { gameCode, handlers = {}, enabled = true, trackErrors = true } = options;
  const { socket, isConnected, isReconnecting } = useSocket();
  const handlersRef = useRef(handlers);

  // Keep handlers ref updated
  handlersRef.current = handlers;

  // Register event handlers
  useEffect(() => {
    if (!socket || !enabled) return;

    const registeredHandlers: Array<[string, (...args: unknown[]) => void]> = [];

    // Register all provided handlers
    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      if (handler) {
        const wrappedHandler = (...args: unknown[]) => {
          try {
            (handler as (...args: unknown[]) => void)(...args);
          } catch (error) {
            if (trackErrors) {
              trackSocketError(
                error instanceof Error ? error : new Error(String(error)),
                event,
                gameCode
              );
            }
          }
        };
        socket.on(event, wrappedHandler);
        registeredHandlers.push([event, wrappedHandler]);
      }
    });

    // Error handler
    const errorHandler = (payload: ErrorPayload) => {
      if (trackErrors) {
        trackSocketError(payload.message, 'error', gameCode);
      }
      handlersRef.current[SERVER_EVENTS.ERROR]?.(payload);
    };

    if (!handlersRef.current[SERVER_EVENTS.ERROR]) {
      socket.on(SERVER_EVENTS.ERROR, errorHandler);
      registeredHandlers.push([SERVER_EVENTS.ERROR, errorHandler as (...args: unknown[]) => void]);
    }

    // Cleanup on unmount
    return () => {
      registeredHandlers.forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [socket, enabled, gameCode, trackErrors]);

  // ==========================================
  // Emit Functions (Memoized)
  // ==========================================

  const emit = useCallback(
    <T = unknown>(event: string, data?: T) => {
      if (socket && isConnected) {
        socket.emit(event, data);
        if (!event.includes('heartbeat') && !event.includes('presence')) {
          trackGameEvent('socket_emit', gameCode || 'unknown', { event });
        }
      }
    },
    [socket, isConnected, gameCode]
  );

  // Game lifecycle
  const createGame = useCallback(
    (payload: CreateGamePayload) => emit(CLIENT_EVENTS.CREATE_GAME, payload),
    [emit]
  );

  const joinGame = useCallback(
    (payload: JoinGamePayload) => emit(CLIENT_EVENTS.JOIN, payload),
    [emit]
  );

  const startGame = useCallback(
    (payload: StartGamePayload) => emit(CLIENT_EVENTS.START_GAME, payload),
    [emit]
  );

  const resetGame = useCallback(
    (code?: string) => emit(CLIENT_EVENTS.RESET_GAME, { gameCode: code || gameCode }),
    [emit, gameCode]
  );

  const closeRoom = useCallback(
    (code: string) => emit(CLIENT_EVENTS.CLOSE_ROOM, { gameCode: code }),
    [emit]
  );

  const leaveRoom = useCallback(
    (code: string, username: string) => emit(CLIENT_EVENTS.LEAVE_ROOM, { gameCode: code, username }),
    [emit]
  );

  const reconnect = useCallback(
    (payload: ReconnectPayload) => emit(CLIENT_EVENTS.RECONNECT, payload),
    [emit]
  );

  // Word submission
  const submitWord = useCallback(
    (payload: SubmitWordPayload) => emit(CLIENT_EVENTS.SUBMIT_WORD, { gameCode, ...payload }),
    [emit, gameCode]
  );

  const submitWordVote = useCallback(
    (payload: VotePayload) => emit(CLIENT_EVENTS.SUBMIT_WORD_VOTE, { gameCode, ...payload }),
    [emit, gameCode]
  );

  const submitPeerVote = useCallback(
    (payload: VotePayload) => emit(CLIENT_EVENTS.SUBMIT_PEER_VALIDATION_VOTE, { gameCode, ...payload }),
    [emit, gameCode]
  );

  // Chat
  const sendChatMessage = useCallback(
    (payload: ChatMessagePayload) => emit(CLIENT_EVENTS.SEND_CHAT_MESSAGE, { gameCode, ...payload }),
    [emit, gameCode]
  );

  // Bots
  const addBot = useCallback(
    (payload: BotPayload) => emit(CLIENT_EVENTS.ADD_BOT, { gameCode, ...payload }),
    [emit, gameCode]
  );

  const removeBot = useCallback(
    (payload: BotPayload) => emit(CLIENT_EVENTS.REMOVE_BOT, { gameCode, ...payload }),
    [emit, gameCode]
  );

  // Tournament
  const createTournament = useCallback(
    (payload: TournamentPayload) => emit(CLIENT_EVENTS.CREATE_TOURNAMENT, { gameCode, ...payload }),
    [emit, gameCode]
  );

  const startTournamentRound = useCallback(
    () => emit(CLIENT_EVENTS.START_TOURNAMENT_ROUND, {}),
    [emit]
  );

  const cancelTournament = useCallback(
    () => emit(CLIENT_EVENTS.CANCEL_TOURNAMENT, {}),
    [emit]
  );

  // Presence
  const sendHeartbeat = useCallback(
    (payload: PresencePayload) => emit(CLIENT_EVENTS.HEARTBEAT, payload),
    [emit]
  );

  const updatePresence = useCallback(
    (payload: PresencePayload) => emit(CLIENT_EVENTS.PRESENCE_UPDATE, payload),
    [emit]
  );

  const updateWindowFocus = useCallback(
    (code: string, isFocused: boolean) =>
      emit(CLIENT_EVENTS.WINDOW_FOCUS_CHANGE, { gameCode: code, isFocused }),
    [emit]
  );

  // Host actions
  const kickPlayer = useCallback(
    (payload: HostActionPayload) => emit(CLIENT_EVENTS.KICK_PLAYER, payload),
    [emit]
  );

  const transferHost = useCallback(
    (payload: HostActionPayload) => emit(CLIENT_EVENTS.TRANSFER_HOST, payload),
    [emit]
  );

  const updateSettings = useCallback(
    (payload: HostActionPayload) => emit(CLIENT_EVENTS.UPDATE_GAME_SETTINGS, payload),
    [emit]
  );

  // Misc
  const getActiveRooms = useCallback(() => emit(CLIENT_EVENTS.GET_ACTIVE_ROOMS), [emit]);

  const getWordsForBoard = useCallback(
    (language: Language, boardSize?: { rows: number; cols: number }) =>
      emit(CLIENT_EVENTS.GET_WORDS_FOR_BOARD, { language, boardSize }),
    [emit]
  );

  // Return memoized object
  return useMemo(
    () => ({
      socket,
      isConnected,
      isReconnecting,
      createGame,
      joinGame,
      startGame,
      resetGame,
      closeRoom,
      leaveRoom,
      reconnect,
      submitWord,
      submitWordVote,
      submitPeerVote,
      sendChatMessage,
      addBot,
      removeBot,
      createTournament,
      startTournamentRound,
      cancelTournament,
      sendHeartbeat,
      updatePresence,
      updateWindowFocus,
      kickPlayer,
      transferHost,
      updateSettings,
      getActiveRooms,
      getWordsForBoard,
      emit,
    }),
    [
      socket,
      isConnected,
      isReconnecting,
      createGame,
      joinGame,
      startGame,
      resetGame,
      closeRoom,
      leaveRoom,
      reconnect,
      submitWord,
      submitWordVote,
      submitPeerVote,
      sendChatMessage,
      addBot,
      removeBot,
      createTournament,
      startTournamentRound,
      cancelTournament,
      sendHeartbeat,
      updatePresence,
      updateWindowFocus,
      kickPlayer,
      transferHost,
      updateSettings,
      getActiveRooms,
      getWordsForBoard,
      emit,
    ]
  );
}

export default useTypedSocket;

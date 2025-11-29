/**
 * Socket.IO Event Type Definitions
 * Defines all WebSocket message types and payloads
 */

import type { Language, GameState, LetterGrid, Avatar, User, PlayerScore, ActiveRoom, DifficultyLevel } from './game';

export type SocketAction =
  | 'createGame'
  | 'join'
  | 'startGame'
  | 'endGame'
  | 'closeRoom'
  | 'resetGame'
  | 'submitWord'
  | 'sendAnswer'
  | 'validateWords'
  | 'getActiveRooms'
  | 'chatMessage'
  | 'ping'
  | 'pong'
  | 'heartbeat'
  | 'updatePresence';

export interface BaseSocketMessage {
  action: SocketAction;
}

export interface CreateGameMessage extends BaseSocketMessage {
  action: 'createGame';
  hostUsername: string;
  hostAvatar: Avatar;
  roomName: string;
  language: Language;
  isRanked?: boolean;
  allowLateJoin?: boolean;
  authUserId?: string;
}

export interface JoinGameMessage extends BaseSocketMessage {
  action: 'join';
  gameCode: string;
  username: string;
  avatar: Avatar;
  authUserId?: string;
  guestTokenHash?: string;
}

export interface StartGameMessage extends BaseSocketMessage {
  action: 'startGame';
  gameCode: string;
  difficulty: DifficultyLevel;
  timerSeconds: number;
  minWordLength?: number;
}

export interface EndGameMessage extends BaseSocketMessage {
  action: 'endGame';
  gameCode: string;
}

export interface CloseRoomMessage extends BaseSocketMessage {
  action: 'closeRoom';
  gameCode: string;
}

export interface ResetGameMessage extends BaseSocketMessage {
  action: 'resetGame';
  gameCode: string;
}

export interface SubmitWordMessage extends BaseSocketMessage {
  action: 'submitWord';
  gameCode: string;
  word: string;
  username: string;
}

export interface SendAnswerMessage extends BaseSocketMessage {
  action: 'sendAnswer';
  gameCode: string;
  words: string[];
  username: string;
}

export interface ValidateWordsMessage extends BaseSocketMessage {
  action: 'validateWords';
  gameCode: string;
  validatedWords: Record<string, Record<string, boolean>>;
}

export interface GetActiveRoomsMessage extends BaseSocketMessage {
  action: 'getActiveRooms';
}

export interface ChatMessage extends BaseSocketMessage {
  action: 'chatMessage';
  gameCode: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface HeartbeatMessage extends BaseSocketMessage {
  action: 'heartbeat';
  gameCode: string;
}

export interface UpdatePresenceMessage extends BaseSocketMessage {
  action: 'updatePresence';
  gameCode: string;
  presence: 'active' | 'idle' | 'afk';
}

export type SocketMessage =
  | CreateGameMessage
  | JoinGameMessage
  | StartGameMessage
  | EndGameMessage
  | CloseRoomMessage
  | ResetGameMessage
  | SubmitWordMessage
  | SendAnswerMessage
  | ValidateWordsMessage
  | GetActiveRoomsMessage
  | ChatMessage
  | HeartbeatMessage
  | UpdatePresenceMessage;

// Server to Client Events
export interface UpdateUsersEvent {
  users: User[];
}

export interface GameStartedEvent {
  letterGrid: LetterGrid;
  timerSeconds: number;
  gameState: GameState;
  difficulty: DifficultyLevel;
  minWordLength: number;
}

export interface WordSubmittedEvent {
  username: string;
  word: string;
  points: number;
  isValid: boolean;
}

export interface GameOverEvent {
  gameState: GameState;
}

export interface ScoresEvent {
  scores: PlayerScore[];
  playerWords: Record<string, string[]>;
}

export interface ActiveRoomsEvent {
  rooms: ActiveRoom[];
}

export interface AchievementUnlockedEvent {
  username: string;
  achievement: string;
  timestamp: number;
}

export interface ErrorEvent {
  message: string;
  code?: string;
}

export interface PresenceUpdateEvent {
  username: string;
  presence: 'active' | 'idle' | 'afk';
  timestamp: number;
}

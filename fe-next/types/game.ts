/**
 * Game Type Definitions
 * Core types for LexiClash game logic
 */

export type Language = 'he' | 'en' | 'sv' | 'ja' | 'es' | 'fr' | 'de';

export type GameState = 'waiting' | 'in-progress' | 'finished' | 'validating';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface Difficulty {
  nameKey: string;
  rows: number;
  cols: number;
}

export interface DifficultySettings {
  EASY: Difficulty;
  MEDIUM: Difficulty;
  HARD: Difficulty;
}

export type LetterGrid = string[][];

export interface GridPosition {
  row: number;
  col: number;
  letter?: string;
}

export interface Avatar {
  emoji: string;
  color: string;
}

export interface User {
  socketId: string;
  username: string;
  avatar: Avatar;
  isHost: boolean;
  authUserId?: string;
  guestTokenHash?: string;
  presence?: 'active' | 'idle' | 'afk';
  lastActivity?: number;
  lastHeartbeat?: number;
}

export interface WordSubmission {
  word: string;
  points: number;
  timestamp: number;
  isValid?: boolean;
  path?: GridPosition[];
}

export interface PlayerScore {
  username: string;
  score: number;
  wordsFound: number;
  validWords: number;
  achievements: string[];
}

export interface Game {
  gameCode: string;
  hostSocketId: string;
  hostUsername: string;
  hostPlayerId?: string;
  roomName: string;
  language: Language;
  users: Record<string, User>;
  playerScores: Record<string, number>;
  playerWords: Record<string, WordSubmission[]>;
  playerAchievements: Record<string, string[]>;
  playerCombos: Record<string, number>;
  gameState: GameState;
  letterGrid: LetterGrid | null;
  timerSeconds: number;
  tournamentId: string | null;
  reconnectionTimeout: NodeJS.Timeout | null;
  validationTimeout?: NodeJS.Timeout | null;
  isRanked: boolean;
  allowLateJoin: boolean;
  createdAt: number;
  lastActivity: number;
  difficulty?: DifficultyLevel;
  minWordLength?: number;
  startedAt?: number;
}

export interface ActiveRoom {
  gameCode: string;
  roomName: string;
  language: Language;
  playerCount: number;
  gameState: GameState;
  isRanked: boolean;
  createdAt: number;
}

export interface MinWordLengthOption {
  value: number;
  labelKey: string;
}

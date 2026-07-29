/**
 * Game Query Manager Module
 * Handles game queries, filtering, and cleanup operations
 * Extracted from gameStateManager.ts for better modularity
 */

import type { Language, GameMode, GameUser, Spectator, LetterGrid } from '@/shared/types/game';
import { MAX_PLAYERS_PER_ROOM } from '../utils/consts';

// Game state type
type GameStateValue = 'waiting' | 'in-progress' | 'validating' | 'finished';

// Base game interface for gameQueryManager
export interface QueryGameBase {
  gameCode: string;
  roomName: string;
  hostUsername: string | null;
  language: Language;
  gameState: GameStateValue;
  isRanked: boolean;
  isPrivate: boolean;
  createdAt: number;
  timerSeconds: number;
  lastActivity: number;
  users: Record<string, GameUser>;
  spectators: Record<string, Spectator>;
  playerScores: Record<string, number>;
  letterGrid: LetterGrid | null;
  tournamentId: string | null;
  gameMode?: GameMode;
}

// Lightweight avatar for room list display (max 4 shown)
export interface RoomPlayerAvatar {
  avatarImage?: string;
  customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig;
  username?: string;
}

// Game summary interface for lightweight listing
export interface GameSummary {
  gameCode: string;
  roomName: string;
  hostUsername: string | null;
  playerCount: number;
  maxPlayers: number;
  gameState: string;
  language: Language;
  gameMode: GameMode;
  playerAvatars: RoomPlayerAvatar[];
}

// Detailed player info for admin dashboard
export interface DetailedGamePlayer {
  username: string;
  avatar: {
    emoji?: string;
    color?: string;
    avatarImage?: string;
    customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig;
  } | null;
  isHost: boolean;
  isBot: boolean;
  presence: 'active' | 'idle' | 'afk' | 'disconnected';
  score: number;
  isAuthenticated: boolean;
  /** Auth user id for linking to admin player profile (null for guests/bots). */
  playerId: string | null;
}

// Detailed game info for admin dashboard
export interface DetailedGame {
  gameCode: string;
  roomName: string;
  language: Language;
  gameState: GameStateValue;
  isRanked: boolean;
  isPrivate: boolean;
  createdAt: number;
  timerSeconds: number;
  gameMode?: GameMode;
  players: DetailedGamePlayer[];
}

/**
 * Get all active games as summaries
 */
export function getAllGames(games: Record<string, QueryGameBase>): GameSummary[] {
  return Object.values(games).map(game => ({
    gameCode: game.gameCode,
    roomName: game.roomName,
    hostUsername: game.hostUsername,
    playerCount: Object.keys(game.users).length,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    gameState: game.gameState,
    language: game.language,
    gameMode: game.gameMode || 'classic',
    playerAvatars: Object.values(game.users).slice(0, 4).map(user => ({
      ...(user.avatar?.avatarImage ? { avatarImage: user.avatar.avatarImage } : {}),
      ...(user.avatar?.customAvatar ? { customAvatar: user.avatar.customAvatar } : {}),
      username: user.username,
    })),
  }));
}

/**
 * Get detailed game information for admin dashboard
 * Includes full player details with presence and scores
 */
export function getDetailedGames(games: Record<string, QueryGameBase>): DetailedGame[] {
  return Object.values(games).map(game => {
    const players: DetailedGamePlayer[] = Object.entries(game.users).map(([username, user]) => {
      // Determine presence status
      let presence: 'active' | 'idle' | 'afk' | 'disconnected' = 'active';
      if (user.disconnected) {
        presence = 'disconnected';
      } else if (user.presence === 'afk') {
        presence = 'afk';
      } else if (user.presence === 'idle') {
        presence = 'idle';
      }

      return {
        username,
        avatar: user.avatar,
        isHost: user.isHost,
        isBot: user.isBot || false,
        presence,
        score: game.playerScores[username] || 0,
        isAuthenticated: !!user.authUserId,
        playerId: user.authUserId ?? user.playerId ?? null,
      };
    });

    // Sort players: host first, then by score descending
    players.sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      return b.score - a.score;
    });

    return {
      gameCode: game.gameCode,
      roomName: game.roomName,
      language: game.language,
      gameState: game.gameState,
      isRanked: game.isRanked,
      isPrivate: game.isPrivate,
      createdAt: game.createdAt,
      timerSeconds: game.timerSeconds,
      gameMode: game.gameMode,
      players,
    };
  });
}

/**
 * Get active rooms for lobby display
 * Filters out rooms with no human players (bots don't count)
 */
export function getActiveRooms(games: Record<string, QueryGameBase>): GameSummary[] {
  const result: GameSummary[] = [];

  for (const game of Object.values(games)) {
    // Single pass: count human players and collect up to 4 avatars
    const playerAvatars: RoomPlayerAvatar[] = [];
    let humanCount = 0;

    for (const user of Object.values(game.users)) {
      if (user.isBot || user.disconnected) continue;
      humanCount++;
      if (playerAvatars.length < 4) {
        playerAvatars.push({
          ...(user.avatar?.avatarImage ? { avatarImage: user.avatar.avatarImage } : {}),
          ...(user.avatar?.customAvatar ? { customAvatar: user.avatar.customAvatar } : {}),
          username: user.username,
        });
      }
    }

    if (humanCount === 0) continue;
    if (game.isPrivate) continue;

    result.push({
      gameCode: game.gameCode,
      roomName: game.roomName,
      hostUsername: game.hostUsername,
      playerCount: humanCount,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      gameState: game.gameState,
      language: game.language,
      gameMode: game.gameMode || 'classic',
      playerAvatars,
    });
  }

  return result;
}

export interface RoomEmptyOptions {
  // When set, a recently-disconnected human user (disconnectedAt within
  // `gracePeriodMs` of now) still counts as "present" — keeps backgrounded
  // hosts' rooms alive across the periodic empty-room sweep.
  gracePeriodMs?: number;
}

/**
 * Check if a specific room is empty (no active human players)
 */
export function isRoomEmpty(game: QueryGameBase | null, opts: RoomEmptyOptions = {}): boolean {
  if (!game) return true;

  const users = Object.values(game.users);
  if (users.length === 0) return true;

  const graceMs = opts.gracePeriodMs;
  const now = Date.now();

  const activeHumanUsers = users.filter(u => {
    if (u.isBot) return false;
    if (!u.disconnected) return true;
    if (graceMs && u.disconnectedAt && now - u.disconnectedAt < graceMs) return true;
    return false;
  });
  return activeHumanUsers.length === 0;
}

/**
 * Get empty rooms (rooms with no active human players)
 */
export function getEmptyRooms(games: Record<string, QueryGameBase>, opts: RoomEmptyOptions = {}): string[] {
  return Object.values(games)
    .filter(game => isRoomEmpty(game, opts))
    .map(game => game.gameCode);
}

/**
 * Get stale game codes (games older than maxAge)
 */
export function getStaleGameCodes(
  games: Record<string, QueryGameBase>,
  maxAge: number = 30 * 60 * 1000
): string[] {
  const now = Date.now();
  return Object.values(games)
    .filter(game => now - game.lastActivity > maxAge)
    .map(game => game.gameCode);
}

/**
 * Get tournament ID for a game
 */
export function getTournamentIdFromGame(game: QueryGameBase | null): string | null {
  return game?.tournamentId || null;
}

/**
 * Set tournament ID for a game
 */
export function setTournamentIdForGame(
  game: QueryGameBase | null,
  tournamentId: string | null
): boolean {
  if (!game) return false;
  (game as { tournamentId: string | null }).tournamentId = tournamentId;
  return true;
}

// CommonJS exports for backward compatibility
module.exports = {
  getAllGames,
  getDetailedGames,
  getActiveRooms,
  isRoomEmpty,
  getEmptyRooms,
  getStaleGameCodes,
  getTournamentIdFromGame,
  setTournamentIdForGame,
};

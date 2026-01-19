/**
 * Game Query Manager Module
 * Handles game queries, filtering, and cleanup operations
 * Extracted from gameStateManager.ts for better modularity
 */

import type { Language, GameUser, Spectator, LetterGrid } from '@/shared/types/game';

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
  createdAt: number;
  timerSeconds: number;
  lastActivity: number;
  users: Record<string, GameUser>;
  spectators: Record<string, Spectator>;
  playerScores: Record<string, number>;
  letterGrid: LetterGrid | null;
  tournamentId: string | null;
}

// Game summary interface for lightweight listing
export interface GameSummary {
  gameCode: string;
  roomName: string;
  hostUsername: string | null;
  playerCount: number;
  gameState: string;
  language: Language;
}

// Detailed player info for admin dashboard
export interface DetailedGamePlayer {
  username: string;
  avatar: { emoji?: string; color?: string; avatarImage?: string } | null;
  isHost: boolean;
  isBot: boolean;
  presence: 'active' | 'idle' | 'afk' | 'disconnected';
  score: number;
  isAuthenticated: boolean;
}

// Detailed game info for admin dashboard
export interface DetailedGame {
  gameCode: string;
  roomName: string;
  language: Language;
  gameState: GameStateValue;
  isRanked: boolean;
  createdAt: number;
  timerSeconds: number;
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
    gameState: game.gameState,
    language: game.language
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
      createdAt: game.createdAt,
      timerSeconds: game.timerSeconds,
      players,
    };
  });
}

/**
 * Get active rooms for lobby display
 * Filters out rooms with no human players (bots don't count)
 */
export function getActiveRooms(games: Record<string, QueryGameBase>): GameSummary[] {
  return Object.values(games)
    .filter(game => {
      // Only show rooms with active human players (bots and disconnected players don't count)
      const humanPlayers = Object.values(game.users).filter(
        user => !user.isBot && !user.disconnected
      );
      return humanPlayers.length > 0;
    })
    .map(game => {
      // Count only active human players for display (exclude disconnected)
      const humanPlayerCount = Object.values(game.users).filter(
        user => !user.isBot && !user.disconnected
      ).length;
      return {
        gameCode: game.gameCode,
        roomName: game.roomName,
        hostUsername: game.hostUsername,
        playerCount: humanPlayerCount,
        gameState: game.gameState,
        language: game.language
      };
    });
}

/**
 * Check if a specific room is empty (no active human players)
 */
export function isRoomEmpty(game: QueryGameBase | null): boolean {
  if (!game) return true;

  const users = Object.values(game.users);
  // Room is empty if no users at all
  if (users.length === 0) return true;
  // Room is empty if no active human players (bots don't count as real players)
  const activeHumanUsers = users.filter(user => !user.disconnected && !user.isBot);
  return activeHumanUsers.length === 0;
}

/**
 * Get empty rooms (rooms with no active human players)
 */
export function getEmptyRooms(games: Record<string, QueryGameBase>): string[] {
  return Object.values(games)
    .filter(game => isRoomEmpty(game))
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

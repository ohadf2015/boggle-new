/**
 * User Manager Module
 * Handles user CRUD operations, socket mappings, and auth connections
 * Extracted from gameStateManager.js for better modularity
 */

import type { GameUser, Avatar, PresenceStatus } from '@/shared/types/game';

// Base game interface that covers what userManager needs
// This is compatible with both Game (shared) and GameState (gameStateManager)
// Using 'any' for arrays to allow flexibility between different achievement/word detail types
export interface GameBase {
  gameCode?: string;
  users: Record<string, GameUser>;
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;
   
  playerAchievements: Record<string, any[]>;
   
  playerWordDetails?: Record<string, any[]>;
  lastActivity: number;
  hostSocketId?: string | null;
}

// Socket to game mapping - maps socket.id to gameCode
const socketToGame = new Map<string, string>();

// Socket to username mapping - maps socket.id to username
const socketToUsername = new Map<string, string>();

// Username to socket mapping - maps "gameCode:username" to socket.id
const usernameToSocket = new Map<string, string>();

// Track authenticated users across all games
// Maps authUserId -> { gameCode, socketId, username, isHost, connectedAt }
export interface AuthUserConnection {
  gameCode: string;
  socketId: string;
  username: string;
  isHost: boolean;
  connectedAt: number;
}

const authUserConnections = new Map<string, AuthUserConnection>();

export interface AddUserOptions {
  avatar?: Avatar | null;
  isHost?: boolean;
  playerId?: string | null;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  guestSessionId?: string | null;
}

export interface GameUserInfo {
  gameCode: string;
  username: string;
  socketId: string;
  avatar?: Avatar | null;
  isHost: boolean;
  playerId?: string | null;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  lastActivityAt?: number;
  isBot?: boolean;
  botDifficulty?: string | null;
}

export interface AuthContext {
  authUserId?: string | null;
  guestTokenHash?: string | null;
}

// Type for games object passed from gameStateManager
type GamesMap = Record<string, GameBase>;

/**
 * Get diagnostic sizes of all internal maps.
 * Useful for health check endpoints and monitoring.
 */
export function getSocketMapSizes(): { socketToGame: number; socketToUsername: number; usernameToSocket: number; authUserConnections: number } {
  return {
    socketToGame: socketToGame.size,
    socketToUsername: socketToUsername.size,
    usernameToSocket: usernameToSocket.size,
    authUserConnections: authUserConnections.size,
  };
}

/**
 * Purge stale socket entries that reference sockets no longer in the Socket.IO server.
 * Call periodically (e.g. every 5 min) to prevent unbounded map growth from
 * orphaned entries where disconnect events were missed.
 */
export function purgeStaleSocketEntries(activeSocketIds: Set<string>): number {
  let purged = 0;

  for (const [socketId] of socketToGame) {
    if (!activeSocketIds.has(socketId)) {
      socketToGame.delete(socketId);
      socketToUsername.delete(socketId);
      purged++;
    }
  }

  // Clean usernameToSocket entries pointing to dead sockets
  for (const [key, socketId] of usernameToSocket) {
    if (!activeSocketIds.has(socketId)) {
      usernameToSocket.delete(key);
      purged++;
    }
  }

  // Clean authUserConnections entries pointing to dead sockets
  for (const [userId, conn] of authUserConnections) {
    if (!activeSocketIds.has(conn.socketId)) {
      authUserConnections.delete(userId);
      purged++;
    }
  }

  return purged;
}

/**
 * Add a user to a game
 */
export function addUserToGame(
  game: GameBase | null,
  gameCode: string,
  username: string,
  socketId: string,
  options: AddUserOptions = {}
): boolean {
  if (!game) return false;

  const { avatar = null, isHost = false, playerId = null, authUserId = null, guestTokenHash = null, guestSessionId = null } = options;

  // Store user data with auth context and presence tracking
  game.users[username] = {
    socketId,
    avatar: avatar || { emoji: '', color: '' },
    isHost,
    playerId,
    authUserId,        // Supabase user ID for authenticated users
    guestTokenHash,    // Hashed guest token for guest users
    guestSessionId,    // Session ID for guest game logging
    username,
    // Presence tracking
    lastActivity: Date.now(),
    lastHeartbeat: Date.now(),
    presence: 'active',
  } as GameUser;

  // Initialize player tracking
  if (!game.playerScores[username]) {
    game.playerScores[username] = 0;
  }
  if (!game.playerWords[username]) {
    game.playerWords[username] = [];
  }
  if (!game.playerAchievements[username]) {
    game.playerAchievements[username] = [];
  }
  if (!game.playerWordDetails) {
    game.playerWordDetails = {};
  }
  if (!game.playerWordDetails[username]) {
    game.playerWordDetails[username] = [];
  }

  // Update mappings
  socketToGame.set(socketId, gameCode);
  socketToUsername.set(socketId, username);
  usernameToSocket.set(`${gameCode}:${username}`, socketId);

  // Track authenticated user globally for multi-tab detection
  if (authUserId) {
    setAuthUserConnection(authUserId, { gameCode, socketId, username, isHost });
  }

  game.lastActivity = Date.now();
  return true;
}

/**
 * Remove a user from a game
 */
export function removeUserFromGame(game: GameBase | null, gameCode: string, username: string): void {
  if (!game) return;

  // Remove from global auth tracking before removing user data
  const userData = game.users[username];
  if (userData && userData.authUserId) {
    removeAuthUserConnection(userData.authUserId);
  }

  const key = `${gameCode}:${username}`;
  const socketId = usernameToSocket.get(key);

  if (socketId) {
    socketToGame.delete(socketId);
    socketToUsername.delete(socketId);
    usernameToSocket.delete(key);
  }

  delete game.users[username];
  game.lastActivity = Date.now();
}

/**
 * Remove a user by socket ID
 */
export function removeUserBySocketId(
  games: GamesMap,
  socketId: string,
  removeUserFn: (gameCode: string, username: string) => void
): { gameCode: string; username: string } | null {
  const gameCode = socketToGame.get(socketId);
  const username = socketToUsername.get(socketId);

  if (!gameCode || !username) return null;

  const game = games[gameCode];
  if (game) {
    removeUserFn(gameCode, username);
  }

  return { gameCode, username };
}

/**
 * Get user's game code by socket ID
 */
export function getGameBySocketId(socketId: string): string | null {
  return socketToGame.get(socketId) || null;
}

/**
 * Get username by socket ID
 */
export function getUsernameBySocketId(socketId: string): string | null {
  return socketToUsername.get(socketId) || null;
}

/**
 * Get socket ID by username in a game
 */
export function getSocketIdByUsername(gameCode: string, username: string): string | null {
  return usernameToSocket.get(`${gameCode}:${username}`) || null;
}

/**
 * Get user by socket ID
 */
export function getUserBySocketId(games: GamesMap, socketId: string): GameUserInfo | null {
  const gameCode = socketToGame.get(socketId);
  const username = socketToUsername.get(socketId);

  if (!gameCode || !username) return null;

  const game = games[gameCode];
  if (!game || !game.users[username]) return null;

  const userData = game.users[username];
  return {
    gameCode,
    socketId: userData.socketId,
    avatar: userData.avatar,
    isHost: userData.isHost,
    username: userData.username,
    playerId: userData.playerId,
    authUserId: userData.authUserId,
    guestTokenHash: userData.guestTokenHash,
    presenceStatus: userData.presence,
    lastActivityAt: userData.lastActivity,
    isBot: userData.isBot,
    botDifficulty: userData.botDifficulty,
  };
}

/**
 * Update a user's socket ID (for reconnection)
 */
export function updateUserSocketId(
  game: GameBase | null,
  gameCode: string,
  username: string,
  newSocketId: string,
  authContext: AuthContext | null = null
): boolean {
  if (!game || !game.users[username]) return false;

  const oldSocketId = game.users[username].socketId;

  // Clean up old mappings
  if (oldSocketId) {
    socketToGame.delete(oldSocketId);
    socketToUsername.delete(oldSocketId);
  }

  // Update user data
  game.users[username].socketId = newSocketId;

  // Update auth context if provided (for reconnection with new auth state)
  // IMPORTANT: Only overwrite if the new value is truthy (not null/undefined)
  // This preserves the existing auth context when reconnecting without auth data
  if (authContext) {
    // Only update authUserId if the new value is truthy (a real user ID)
    // This prevents clearing an existing authUserId when reconnecting without auth data
    if (authContext.authUserId) {
      game.users[username].authUserId = authContext.authUserId;
    }
    // Only update guestTokenHash if the new value is truthy
    if (authContext.guestTokenHash) {
      game.users[username].guestTokenHash = authContext.guestTokenHash;
    }
  }

  // Set up new mappings
  socketToGame.set(newSocketId, gameCode);
  socketToUsername.set(newSocketId, username);
  usernameToSocket.set(`${gameCode}:${username}`, newSocketId);

  // Update auth user connection tracking
  const authUserId = authContext?.authUserId || game.users[username]?.authUserId;
  if (authUserId) {
    setAuthUserConnection(authUserId, {
      gameCode,
      socketId: newSocketId,
      username,
      isHost: game.users[username]?.isHost || false
    });
  }

  return true;
}

/**
 * Update username in socket mappings (for guest name changes)
 */
export function updateUsernameMapping(gameCode: string, oldUsername: string, newUsername: string, socketId: string): void {
  // Remove old mappings
  usernameToSocket.delete(`${gameCode}:${oldUsername}`);

  // Set new mappings
  socketToUsername.set(socketId, newUsername);
  usernameToSocket.set(`${gameCode}:${newUsername}`, socketId);
}

/**
 * Get all users in a game
 */
export function getGameUsers(game: GameBase | null): GameUserInfo[] {
  if (!game || !game.users) return [];

  const gameCode = game.gameCode || '';
  return Object.entries(game.users)
    .filter(([, data]) => data != null)
    .map(([username, data]) => ({
      gameCode,
      username,
      socketId: data.socketId,
      isHost: data.isHost,
      avatar: data.avatar,
      // Include presence information
      presenceStatus: data.presence || 'active',
      isWindowFocused: true,
      lastActivityAt: data.lastActivity || Date.now(),
      // Include bot information
      isBot: data.isBot || false,
      botDifficulty: data.botDifficulty || null,
    }));
}

/**
 * Check if user is host
 */
export function isHost(games: GamesMap, socketId: string): boolean {
  const gameCode = socketToGame.get(socketId);
  if (!gameCode) return false;

  const game = games[gameCode];
  if (!game) return false;

  return game.hostSocketId === socketId;
}

/**
 * Update host socket ID (for reconnection)
 */
export function updateHostSocketId(game: GameBase | null, newSocketId: string): void {
  if (game) {
    game.hostSocketId = newSocketId;
  }
}

/**
 * Get connection info for an authenticated user
 */
export function getAuthUserConnection(authUserId: string): AuthUserConnection | null {
  if (!authUserId) return null;
  return authUserConnections.get(authUserId) || null;
}

/**
 * Set connection info for an authenticated user
 */
export function setAuthUserConnection(
  authUserId: string,
  connectionInfo: Omit<AuthUserConnection, 'connectedAt'>
): void {
  if (!authUserId) return;
  authUserConnections.set(authUserId, {
    ...connectionInfo,
    connectedAt: Date.now()
  });
}

/**
 * Remove connection info for an authenticated user
 */
export function removeAuthUserConnection(authUserId: string): void {
  if (!authUserId) return;
  authUserConnections.delete(authUserId);
}

/**
 * Clear socket mappings without removing user data (for disconnect grace period)
 */
export function clearSocketMappings(socketId: string): { gameCode: string; username: string } | null {
  const gameCode = socketToGame.get(socketId);
  const username = socketToUsername.get(socketId);

  if (!gameCode || !username) return null;

  socketToGame.delete(socketId);
  socketToUsername.delete(socketId);
  // Note: Don't delete usernameToSocket - user data remains valid for reconnection

  return { gameCode, username };
}

/**
 * Clear ALL socket mappings for intentional leave (user data preserved in game.users)
 * This prevents stale socket IDs from causing issues when player rejoins
 */
export function clearSocketMappingsForLeave(socketId: string, gameCode: string, username: string): void {
  socketToGame.delete(socketId);
  socketToUsername.delete(socketId);
  usernameToSocket.delete(`${gameCode}:${username}`);
}

/**
 * Clean up user mappings for a game being deleted
 */
export function cleanupUserMappings(game: GameBase | null, gameCode: string): void {
  if (!game) return;

  for (const username of Object.keys(game.users)) {
    const userData = game.users[username];
    // Clean auth user connections for this game
    if (userData && userData.authUserId) {
      authUserConnections.delete(userData.authUserId);
    }

    const key = `${gameCode}:${username}`;
    const socketId = usernameToSocket.get(key);
    if (socketId) {
      socketToGame.delete(socketId);
      socketToUsername.delete(socketId);
      usernameToSocket.delete(key);
    }
  }
}

/**
 * Remove stale auth user connections whose games no longer exist.
 * Should be called periodically (e.g., every 5 minutes) to prevent unbounded growth.
 */
export function cleanupStaleAuthConnections(activeGameCodes: Set<string>): number {
  let cleaned = 0;
  for (const [authUserId, conn] of authUserConnections.entries()) {
    if (!activeGameCodes.has(conn.gameCode)) {
      authUserConnections.delete(authUserId);
      cleaned++;
    }
  }
  return cleaned;
}

// Test-only named exports for internal maps
export { socketToGame as _socketToGame, socketToUsername as _socketToUsername, usernameToSocket as _usernameToSocket, authUserConnections as _authUserConnections };

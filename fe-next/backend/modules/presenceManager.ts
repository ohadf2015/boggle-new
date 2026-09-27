/**
 * Presence Manager Module
 * Handles user presence tracking, heartbeat, and connection health
 * Extracted from gameStateManager.js for better modularity
 */

import type { PresenceStatus, GameUser } from '@/shared/types/game';

// Base game interface for presenceManager - compatible with both Game and GameState
export interface PresenceGameBase {
  users: Record<string, GameUser>;
  lastActivity?: number;
}

// Presence tracking configuration
export const PRESENCE_CONFIG = {
  IDLE_THRESHOLD: 30000,     // 30 seconds without activity = idle
  AFK_THRESHOLD: 45000,      // 45 seconds without activity = afk (for testing, change to 120000 for production)
  HEARTBEAT_TIMEOUT: 30000,  // 30 seconds without heartbeat = disconnected (increased for poor connections)
  WEAK_CONNECTION_THRESHOLD: 15000, // 15 seconds without heartbeat = weak connection warning
  MISSED_HEARTBEATS_FOR_WEAK: 2,    // Number of consecutive missed heartbeats before weak connection
} as const;

export type ConnectionStatus = 'stable' | 'weak' | 'timeout' | 'unknown';

export interface PresenceData {
  isWindowFocused?: boolean;
  lastActivityAt?: number;
  forceIdle?: boolean;
}

export interface ConnectionStatusChange {
  statusChange: 'recovered';
  previousStatus: 'weak';
  newStatus: 'stable';
}

export interface ConnectionHealthStatus {
  status: ConnectionStatus;
  healthy: boolean;
  missedHeartbeats?: number;
  timeSinceHeartbeat?: number;
}

export interface UserPresenceInfo {
  username: string;
  presenceStatus: PresenceStatus;
  isWindowFocused: boolean;
  lastActivityAt?: number;
  lastHeartbeatAt?: number;
  connectionStatus: ConnectionStatus;
}

// Extended user type for presence tracking
interface UserWithPresence {
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  lastActivityAt?: number;
  lastHeartbeatAt?: number;
  connectionStatus?: ConnectionStatus;
  missedHeartbeats?: number;
  disconnected?: boolean;
}

// Extended game type for host tracking
interface GameWithHost extends PresenceGameBase {
  hostLastActiveAt?: number;
  hostStatus?: 'active' | 'idle';
}

/**
 * Update user presence status
 */
export function updateUserPresence(
  game: PresenceGameBase | null,
  username: string,
  presenceData: PresenceData | null
): PresenceStatus | null {
  if (!game || !game.users[username]) return null;
  if (!presenceData) return null;

  const user = game.users[username] as UserWithPresence;
  const now = Date.now();

  // Update presence data
  if (presenceData.isWindowFocused !== undefined) {
    user.isWindowFocused = presenceData.isWindowFocused;
  }
  if (presenceData.lastActivityAt !== undefined) {
    user.lastActivityAt = presenceData.lastActivityAt;
  }

  // Calculate presence status based on window focus and activity time
  const timeSinceActivity = now - (user.lastActivityAt || now);
  let newStatus: PresenceStatus = 'active';

  // Check for AFK first (regardless of window focus - 2 minutes of inactivity)
  if (timeSinceActivity >= PRESENCE_CONFIG.AFK_THRESHOLD) {
    newStatus = 'afk';
  }
  // If not AFK, check if idle (either window not focused OR 30 seconds of inactivity)
  else if (!user.isWindowFocused || presenceData.forceIdle || timeSinceActivity >= PRESENCE_CONFIG.IDLE_THRESHOLD) {
    newStatus = 'idle';
  }
  // else stays 'active'

  user.presenceStatus = newStatus;
  return newStatus;
}

/**
 * Update user heartbeat (proves connection is alive)
 */
export function updateUserHeartbeat(
  game: PresenceGameBase | null,
  username: string
): ConnectionStatusChange | null {
  if (!game || !game.users[username]) return null;

  const user = game.users[username] as UserWithPresence;
  const now = Date.now();
  const wasWeakConnection = user.connectionStatus === 'weak';

  // Reset heartbeat tracking
  user.lastHeartbeatAt = now;
  user.missedHeartbeats = 0;
  user.connectionStatus = 'stable';

  // Return status change if connection was previously weak
  if (wasWeakConnection) {
    return {
      statusChange: 'recovered',
      previousStatus: 'weak',
      newStatus: 'stable'
    };
  }
  return null;
}

/**
 * Check user connection health based on heartbeats
 */
export function checkUserConnectionHealth(
  game: PresenceGameBase | null,
  username: string
): ConnectionHealthStatus {
  if (!game || !game.users[username]) {
    return { status: 'unknown', healthy: false };
  }

  const user = game.users[username] as UserWithPresence;
  const now = Date.now();
  const timeSinceHeartbeat = now - (user.lastHeartbeatAt || now);

  // Initialize tracking fields if needed
  if (user.missedHeartbeats === undefined) {
    user.missedHeartbeats = 0;
  }
  if (user.connectionStatus === undefined) {
    user.connectionStatus = 'stable';
  }

  // Check if heartbeat is overdue
  if (timeSinceHeartbeat >= PRESENCE_CONFIG.WEAK_CONNECTION_THRESHOLD) {
    const expectedHeartbeats = Math.floor(timeSinceHeartbeat / 10000); // Heartbeats are every 10s
    user.missedHeartbeats = Math.max(user.missedHeartbeats, expectedHeartbeats);

    if (user.missedHeartbeats >= PRESENCE_CONFIG.MISSED_HEARTBEATS_FOR_WEAK) {
      user.connectionStatus = 'weak';
      return {
        status: 'weak',
        healthy: true, // Still healthy, just weak - don't disconnect yet
        missedHeartbeats: user.missedHeartbeats,
        timeSinceHeartbeat
      };
    }
  }

  // Check for complete timeout (still within grace period though)
  if (timeSinceHeartbeat >= PRESENCE_CONFIG.HEARTBEAT_TIMEOUT) {
    return {
      status: 'timeout',
      healthy: false,
      missedHeartbeats: user.missedHeartbeats,
      timeSinceHeartbeat
    };
  }

  return {
    status: user.connectionStatus || 'stable',
    healthy: true,
    missedHeartbeats: user.missedHeartbeats || 0,
    timeSinceHeartbeat
  };
}

/**
 * Mark user activity (reset idle timer)
 */
export function markUserActivity(game: PresenceGameBase | null, username: string): void {
  if (!game || !game.users[username]) return;

  const now = Date.now();
  const user = game.users[username] as UserWithPresence;
  user.lastActivityAt = now;
  user.lastHeartbeatAt = now;

  // If user was idle/afk and window is focused, set back to active
  if (user.isWindowFocused) {
    user.presenceStatus = 'active';
  }
}

/**
 * Get presence configuration
 */
export function getPresenceConfig(): typeof PRESENCE_CONFIG {
  return { ...PRESENCE_CONFIG };
}

/**
 * Get all users with their presence status
 */
export function getUsersWithPresence(game: PresenceGameBase | null): UserPresenceInfo[] {
  if (!game || !game.users) return [];

  return Object.entries(game.users)
    .filter(([, user]) => user != null)
    .map(([username, user]) => {
      const userData = user as UserWithPresence;
      return {
        username,
        presenceStatus: userData.presenceStatus || 'active',
        isWindowFocused: userData.isWindowFocused !== false,
        lastActivityAt: userData.lastActivityAt,
        lastHeartbeatAt: userData.lastHeartbeatAt,
        connectionStatus: userData.connectionStatus || 'stable',
      };
    });
}

/**
 * Check if user is considered disconnected based on heartbeat
 */
export function isUserDisconnected(game: PresenceGameBase | null, username: string): boolean {
  if (!game || !game.users[username]) return true;

  const user = game.users[username] as UserWithPresence;
  if (user.disconnected) return true;

  const health = checkUserConnectionHealth(game, username);
  return !health.healthy;
}

/**
 * Mark host as active (called on keepalive)
 */
export function markHostActive(game: PresenceGameBase | null): void {
  if (!game) return;

  const gameWithHost = game as GameWithHost;
  gameWithHost.hostLastActiveAt = Date.now();
  gameWithHost.hostStatus = 'active';
  game.lastActivity = Date.now();
}

/**
 * Reactivate host after being idle
 */
export function reactivateHost(game: PresenceGameBase | null): boolean {
  if (!game) return false;

  const gameWithHost = game as GameWithHost;
  gameWithHost.hostLastActiveAt = Date.now();
  gameWithHost.hostStatus = 'active';
  game.lastActivity = Date.now();
  return true;
}


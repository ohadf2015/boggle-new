/**
 * Connection Utilities
 * Shared logic for connection status, disconnect/reconnect events
 */
import { neoSuccessToast, neoInfoToast } from '../../components/NeoToast';
import logger from '@/utils/logger';

// ==================== Types ====================

export interface ConnectionStatusData {
  username: string;
  connectionStatus: 'weak' | 'stable';
  message?: string;
}

export interface PlayerEventData {
  username: string;
  message?: string;
}

// ==================== Handlers ====================

/**
 * Handle player connection status change (weak/stable)
 */
export function handlePlayerConnectionStatusChanged(
  data: ConnectionStatusData,
  t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
): void {
  logger.log(`[${context}] Player connection status changed:`, data);

  if (data.connectionStatus === 'weak') {
    neoInfoToast(
      data.message || `${data.username} ${t('playerView.weakConnection') || 'has weak connection'}`,
      {
        icon: '📶',
        duration: 4000,
      }
    );
  } else if (data.connectionStatus === 'stable') {
    neoSuccessToast(
      data.message || `${data.username} ${t('playerView.connectionRecovered') || 'connection recovered'}`,
      {
        icon: '✅',
        duration: 2000,
      }
    );
  }
}

/**
 * Delay before showing opponent disconnect notification.
 * Hides brief disconnects (< 6s) from other players to prevent:
 * 1. Exploitation (rushing while opponent reconnects)
 * 2. Unnecessary anxiety for spectators
 * Pattern used by Clash Royale and Among Us.
 */
const OPPONENT_DISCONNECT_DELAY_MS = 6000;

// Track pending disconnect notifications so they can be cancelled on reconnect
const pendingDisconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Cancel a pending disconnect notification (called when player reconnects quickly)
 */
export function cancelPendingDisconnectNotification(username: string): boolean {
  const timer = pendingDisconnectTimers.get(username);
  if (timer) {
    clearTimeout(timer);
    pendingDisconnectTimers.delete(username);
    return true;
  }
  return false;
}

/**
 * Handle player disconnected event.
 * Delays the notification to hide brief disconnections from opponents.
 */
export function handlePlayerDisconnected(
  data: PlayerEventData,
  t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
): void {
  logger.log(`[${context}] Player disconnected:`, data.username);

  // Cancel any existing pending notification for this player
  cancelPendingDisconnectNotification(data.username);

  // Delay showing the notification — if they reconnect within 6s, nobody knows
  const timer = setTimeout(() => {
    pendingDisconnectTimers.delete(data.username);
    neoInfoToast(
      data.message || `${data.username} ${t('playerView.disconnected') || 'disconnected. Waiting for reconnection...'}`,
      {
        icon: '📡',
        duration: 3000,
      }
    );
  }, OPPONENT_DISCONNECT_DELAY_MS);

  pendingDisconnectTimers.set(data.username, timer);
}

/**
 * Handle player reconnected event.
 * If they reconnected within the delay window, the disconnect toast
 * was never shown — the disconnection was invisible to opponents.
 */
export function handlePlayerReconnected(
  data: PlayerEventData,
  t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
): void {
  logger.log(`[${context}] Player reconnected:`, data.username);

  // If the disconnect notification was still pending, cancel it silently
  const wasPending = cancelPendingDisconnectNotification(data.username);
  if (wasPending) {
    logger.log(`[${context}] Quick reconnect — disconnect was invisible to opponents`);
    return; // Don't show reconnect toast either — nobody knew they left
  }

  neoSuccessToast(
    data.message || `${data.username} ${t('playerView.reconnected') || 'reconnected'}`,
    {
      icon: '✅',
      duration: 2000,
    }
  );
}

/**
 * Handle player left event
 */
export function handlePlayerLeft(
  data: PlayerEventData,
  t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
): void {
  logger.log(`[${context}] Player left:`, data.username);
  neoInfoToast(
    data.message || `${data.username} ${t('playerView.leftRoom') || 'left the room'}`,
    {
      icon: '👋',
      duration: 2000,
    }
  );
}

/**
 * Create all connection-related handlers
 * @param t - Translation function
 * @param context - 'HOST' or 'PLAYER'
 * @param currentUsername - Optional current user's username to filter self-notifications
 */
export function createConnectionHandlers(
  t: (key: string) => string,
  context: 'HOST' | 'PLAYER',
  currentUsername?: string
) {
  return {
    handlePlayerDisconnected: (data: PlayerEventData) => {
      // Don't show notification about yourself disconnecting
      if (currentUsername && data.username === currentUsername) {
        logger.log(`[${context}] Skipping self-disconnect notification`);
        return;
      }
      handlePlayerDisconnected(data, t, context);
    },
    handlePlayerReconnected: (data: PlayerEventData) => {
      // Don't show notification about yourself reconnecting
      if (currentUsername && data.username === currentUsername) {
        logger.log(`[${context}] Skipping self-reconnect notification`);
        return;
      }
      handlePlayerReconnected(data, t, context);
    },
    handlePlayerConnectionStatusChanged: (data: ConnectionStatusData) => {
      // Don't show notification about your own connection status
      if (currentUsername && data.username === currentUsername) {
        logger.log(`[${context}] Skipping self-connection-status notification`);
        return;
      }
      handlePlayerConnectionStatusChanged(data, t, context);
    },
    handlePlayerLeft: (data: PlayerEventData) => {
      // Don't show notification about yourself leaving
      if (currentUsername && data.username === currentUsername) {
        logger.log(`[${context}] Skipping self-left notification`);
        return;
      }
      handlePlayerLeft(data, t, context);
    },
  };
}

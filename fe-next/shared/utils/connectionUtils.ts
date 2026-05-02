/**
 * Connection Utilities
 * Shared logic for connection status, disconnect/reconnect events
 */
import { neoInfoToast } from '../../components/NeoToast';
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

// Shared toast slot for all room-presence chatter — matches the join/leave hook
// so disconnect/leave/host events never stack.
const ROOM_TOAST_ID = 'mp-room-presence';

/**
 * Handle player connection status change (weak/stable).
 * Silent by design — the player roster surfaces a presence dot, and toasting
 * every wifi blip ("📶 weak", "✅ recovered") is the noise the user hated.
 */
export function handlePlayerConnectionStatusChanged(
  data: ConnectionStatusData,
  _t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
): void {
  logger.log(`[${context}] Player connection status changed (silent):`, data);
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
        duration: 2500,
        id: ROOM_TOAST_ID,
      }
    );
  }, OPPONENT_DISCONNECT_DELAY_MS);

  pendingDisconnectTimers.set(data.username, timer);
}

/**
 * Handle player reconnected event.
 * Silent — when reconnect happens inside the 6s grace window the disconnect
 * toast was never shown anyway, and after a longer absence the roster going
 * green is enough signal. "✅ X reconnected" was the chatty toast users hated.
 */
export function handlePlayerReconnected(
  data: PlayerEventData,
  _t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
): void {
  logger.log(`[${context}] Player reconnected (silent):`, data.username);
  // Cancel any still-pending disconnect toast — the player is back before
  // we ever told the room they left, so stay silent.
  cancelPendingDisconnectNotification(data.username);
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
      duration: 2200,
      id: ROOM_TOAST_ID,
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

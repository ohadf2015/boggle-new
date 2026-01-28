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
 * Handle player disconnected event
 */
export function handlePlayerDisconnected(
  data: PlayerEventData,
  t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
): void {
  logger.log(`[${context}] Player disconnected:`, data.username);
  neoInfoToast(
    data.message || `${data.username} ${t('playerView.disconnected') || 'disconnected. Waiting for reconnection...'}`,
    {
      icon: '📡',
      duration: 3000,
    }
  );
}

/**
 * Handle player reconnected event
 */
export function handlePlayerReconnected(
  data: PlayerEventData,
  t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
): void {
  logger.log(`[${context}] Player reconnected:`, data.username);
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

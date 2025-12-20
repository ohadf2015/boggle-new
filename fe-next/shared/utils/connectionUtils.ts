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
 */
export function createConnectionHandlers(
  t: (key: string) => string,
  context: 'HOST' | 'PLAYER'
) {
  return {
    handlePlayerDisconnected: (data: PlayerEventData) =>
      handlePlayerDisconnected(data, t, context),
    handlePlayerReconnected: (data: PlayerEventData) =>
      handlePlayerReconnected(data, t, context),
    handlePlayerConnectionStatusChanged: (data: ConnectionStatusData) =>
      handlePlayerConnectionStatusChanged(data, t, context),
    handlePlayerLeft: (data: PlayerEventData) =>
      handlePlayerLeft(data, t, context),
  };
}

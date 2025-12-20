/**
 * Game Event Utilities
 * Shared logic for game lifecycle events
 */
import { Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { neoSuccessToast, neoErrorToast } from '../../components/NeoToast';
import { clearSessionPreservingUsername } from '../../utils/session';
import logger from '@/utils/logger';

// ==================== Types ====================

export interface RoomClosedData {
  message?: string;
}

export interface StartGameAckData {
  messageId?: string;
  skipAck?: boolean;
}

// ==================== Constants ====================

/** Confetti configuration for game over celebration */
export const GAME_OVER_CONFETTI_CONFIG = {
  particleCount: 150,
  spread: 80,
  origin: { y: 0.6 },
};

/** Confetti configuration for tournament complete celebration */
export const TOURNAMENT_COMPLETE_CONFETTI_CONFIG = {
  particleCount: 200,
  spread: 100,
  origin: { y: 0.5 },
};

// ==================== Handlers ====================

/**
 * Handle room closed event (inactivity or host left)
 * Shows toast, clears session, disconnects and reloads
 */
export function handleRoomClosed(
  socket: Socket,
  username: string,
  message: string,
  icon: string,
  intentionalExitRef: React.MutableRefObject<boolean>
): void {
  intentionalExitRef.current = true;
  neoErrorToast(message, {
    icon,
    duration: 5000,
  });
  setTimeout(() => {
    clearSessionPreservingUsername(username);
    socket.disconnect();
    window.location.reload();
  }, 2000);
}

/**
 * Create a room closed handler for host (inactivity)
 */
export function createRoomClosedDueToInactivityHandler(
  socket: Socket,
  username: string,
  t: (key: string) => string,
  intentionalExitRef: React.MutableRefObject<boolean>
): (data: RoomClosedData) => void {
  return (data: RoomClosedData) => {
    handleRoomClosed(
      socket,
      username,
      data.message || t('hostView.roomClosedInactivity'),
      '⏰',
      intentionalExitRef
    );
  };
}

/**
 * Create a room closed handler for player (host left)
 */
export function createHostLeftRoomClosingHandler(
  socket: Socket,
  username: string,
  t: (key: string) => string,
  intentionalExitRef: React.MutableRefObject<boolean>
): (data: RoomClosedData) => void {
  return (data: RoomClosedData) => {
    handleRoomClosed(
      socket,
      username,
      data.message || t('playerView.roomClosed'),
      '🚪',
      intentionalExitRef
    );
  };
}

/**
 * Send start game acknowledgment if required
 */
export function sendStartGameAck(
  socket: Socket,
  data: StartGameAckData,
  context: 'HOST' | 'PLAYER'
): void {
  if (data.messageId && !data.skipAck) {
    socket.emit('startGameAck', { messageId: data.messageId });
    logger.log(`[${context}] Sent startGameAck for messageId:`, data.messageId);
  }
}

/**
 * Trigger game over celebration with confetti
 */
export function triggerGameOverCelebration(): void {
  confetti(GAME_OVER_CONFETTI_CONFIG);
}

/**
 * Trigger tournament complete celebration with confetti
 */
export function triggerTournamentCompleteCelebration(): void {
  confetti(TOURNAMENT_COMPLETE_CONFETTI_CONFIG);
}

/**
 * Show game complete toast with confetti
 */
export function showGameCompleteToast(t: (key: string) => string): void {
  triggerGameOverCelebration();
  neoSuccessToast(t('hostView.gameComplete') || 'Game complete!', {
    icon: '🎉',
    duration: 3000,
  });
}

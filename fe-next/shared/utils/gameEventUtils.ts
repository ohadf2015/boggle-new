/**
 * Game Event Utilities
 * Shared logic for game lifecycle events
 */
import { Socket } from 'socket.io-client';
import { fireGameOverConfetti, fireConfetti, DEFAULT_COLORS } from '../../utils/confettiUtils';
import { neoErrorToast } from '../../components/NeoToast';
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
 * Signal that the client's pre-game countdown animation has finished.
 * Server starts the round timer once every expected client reports.
 */
export function sendCountdownComplete(
  socket: Socket,
  messageId: string | null | undefined,
  context: 'HOST' | 'PLAYER'
): void {
  if (!messageId) return;
  socket.emit('countdownComplete', { messageId });
  logger.log(`[${context}] Sent countdownComplete for messageId:`, messageId);
}

/**
 * Process-local stash for the latest startGame messageId per role.
 * Both Host and Player can receive startGame via two paths (page-level
 * `pendingGameStart` for cold mount; socket events for hot mount on
 * subsequent rounds). The countdown animation lives in a different scope
 * than either receiver, so we stash the id where the animation can find it.
 */
const stashedMessageIds: Record<string, string | null> = {};

export function stashStartGameMessageId(role: 'HOST' | 'PLAYER', messageId: string | null | undefined): void {
  stashedMessageIds[role] = messageId ?? null;
}

export function consumeStashedMessageId(role: 'HOST' | 'PLAYER'): string | null {
  const id = stashedMessageIds[role] ?? null;
  stashedMessageIds[role] = null;
  return id;
}

/**
 * Process-local record of the last startGame messageId fully handled per role.
 * A normal MP game start is processed by two handlers — the socket listener in
 * `usePlayerGameEvents` AND PlayerView's `pendingGameStart` effect. The socket
 * listener marks the id here so the effect can skip the redundant store/timer/
 * ack work, while still running its effect-only work (mode-reveal trigger). The
 * effect stays the sole handler when the socket listener is unmounted (player
 * sitting on the results screen).
 */
const handledStartGameIds: Record<string, string | null> = {};

export function markStartGameHandled(role: 'HOST' | 'PLAYER', messageId: string | null | undefined): void {
  handledStartGameIds[role] = messageId ?? null;
}

export function wasStartGameHandled(role: 'HOST' | 'PLAYER', messageId: string | null | undefined): boolean {
  if (!messageId) return false;
  return handledStartGameIds[role] === messageId;
}

/**
 * Trigger game over celebration with confetti
 */
export function triggerGameOverCelebration(): void {
  fireGameOverConfetti();
}

/**
 * Trigger tournament complete celebration with confetti
 */
export function triggerTournamentCompleteCelebration(): void {
  fireConfetti({
    particleCount: 200,
    spread: 100,
    origin: { y: 0.5 },
    colors: DEFAULT_COLORS,
  });
}

/**
 * Show game complete toast with confetti
 */
export function showGameCompleteToast(_t: (key: string) => string): void {
  triggerGameOverCelebration();
}

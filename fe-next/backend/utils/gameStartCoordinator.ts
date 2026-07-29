/**
 * Game Start Coordinator - Production-ready acknowledgment system
 * Ensures all players are ready before starting game timer
 */

import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

interface GameStartSequence {
  messageId: string;
  gameCode: string;
  timerSeconds: number;
  startedAt: number;
  expectedPlayers: Set<string>;
  acknowledgedPlayers: Set<string>;
  countdownCompletePlayers: Set<string>;
  failedPlayers: Set<string>;
  retryTimeouts: ReturnType<typeof setTimeout>[];
  ackTimeout: ReturnType<typeof setTimeout> | null;
  countdownTimeout: ReturnType<typeof setTimeout> | null;
  timerStarted: boolean;
  timerStartedAt: number | null;
  cancelled: boolean;
  retryAttempts: Map<string, number>;
}

interface AcknowledgmentResult {
  valid: boolean;
  reason?: string;
  late?: boolean;
  duplicate?: boolean;
  allReady?: boolean;
  waitTime?: number;
  acknowledgedCount?: number;
  expectedCount?: number;
}

interface DisconnectResult {
  startTimer: boolean;
}

interface TimeoutStats {
  acknowledged: number;
  expected: number;
  missing: string[];
  waitTime: number;
}

interface SequenceStats {
  messageId: string;
  startedAt: number;
  timerStarted: boolean;
  timerStartedAt: number | null;
  acknowledged: string[];
  missing: string[];
  failed: string[];
  acknowledgedCount: number;
  expectedCount: number;
  waitTime: number | null;
}

type SendFunction = (username: string) => boolean;
type TimeoutCallback = (stats: TimeoutStats) => void;

// ==========================================
// Game Start Coordinator Class
// ==========================================

class GameStartCoordinator {
  // Track active game start sequences
  private activeSequences: Map<string, GameStartSequence>;

  constructor() {
    this.activeSequences = new Map();
  }

  /**
   * Initialize a new game start sequence
   */
  initializeSequence(gameCode: string, players: string[], timerSeconds: number): string {
    // Clean up any existing sequence for this game
    this.cleanupSequence(gameCode);

    const messageId = `start-${gameCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const sequence: GameStartSequence = {
      messageId,
      gameCode,
      timerSeconds,
      startedAt: Date.now(),
      expectedPlayers: new Set(players),
      acknowledgedPlayers: new Set(),
      countdownCompletePlayers: new Set(),
      failedPlayers: new Set(),
      retryTimeouts: [],
      ackTimeout: null,
      countdownTimeout: null,
      timerStarted: false,
      timerStartedAt: null,
      cancelled: false,
      retryAttempts: new Map(),
    };

    this.activeSequences.set(gameCode, sequence);

    logger.debug('GAME_START', `Initialized sequence ${messageId} for game ${gameCode} with ${players.length} players`);

    return messageId;
  }

  /**
   * Record player acknowledgment
   * Returns true if this was the final needed acknowledgment
   */
  recordAcknowledgment(gameCode: string, username: string, messageId: string): AcknowledgmentResult {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence) {
      return { valid: false, reason: 'no_active_sequence' };
    }

    if (sequence.cancelled) {
      return { valid: false, reason: 'sequence_cancelled' };
    }

    if (sequence.messageId !== messageId) {
      logger.info('GAME_START', `Wrong messageId from ${username}. Expected: ${sequence.messageId}, Got: ${messageId}`);
      return { valid: false, reason: 'wrong_message_id' };
    }

    if (sequence.timerStarted) {
      return { valid: true, reason: 'timer_already_started', late: true };
    }

    if (!sequence.expectedPlayers.has(username)) {
      return { valid: false, reason: 'unexpected_player' };
    }

    if (sequence.acknowledgedPlayers.has(username)) {
      return { valid: true, reason: 'already_acknowledged', duplicate: true };
    }

    // Record the acknowledgment
    sequence.acknowledgedPlayers.add(username);
    sequence.failedPlayers.delete(username); // Remove from failed list if present

    const ackCount = sequence.acknowledgedPlayers.size;
    const expectedCount = sequence.expectedPlayers.size;

    logger.debug('GAME_START', `Acknowledgment from ${username} (${ackCount}/${expectedCount})`);

    // Check if all players have acknowledged
    const allAcknowledged = ackCount === expectedCount;

    if (allAcknowledged && !sequence.timerStarted) {
      sequence.timerStarted = true;
      sequence.timerStartedAt = Date.now();

      // Clear the timeout since we got all acks
      if (sequence.ackTimeout) {
        clearTimeout(sequence.ackTimeout);
        sequence.ackTimeout = null;
      }

      // Clear any pending retries
      this.clearRetryTimeouts(sequence);

      const waitTime = sequence.timerStartedAt - sequence.startedAt;
      logger.info('GAME_START', `All players ready! Starting timer after ${waitTime}ms wait`);

      return {
        valid: true,
        allReady: true,
        waitTime,
        acknowledgedCount: ackCount,
        expectedCount
      };
    }

    return {
      valid: true,
      allReady: false,
      acknowledgedCount: ackCount,
      expectedCount
    };
  }

  /**
   * Handle player disconnection during sequence
   */
  handlePlayerDisconnect(gameCode: string, username: string): DisconnectResult | void {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence || sequence.cancelled || sequence.timerStarted) {
      return;
    }

    if (sequence.expectedPlayers.has(username)) {
      logger.debug('GAME_START', `Player ${username} disconnected during start sequence`);

      // Remove from expected players
      sequence.expectedPlayers.delete(username);
      sequence.acknowledgedPlayers.delete(username);
      sequence.countdownCompletePlayers.delete(username);
      sequence.failedPlayers.delete(username);

      // Check if we now have all remaining players ready.
      // Use countdownComplete (not ack), since the round timer is gated on
      // countdown completion now — otherwise a disconnect after ack but
      // before the leaver finished the 3-2-1 would let the timer start
      // before remaining players' countdowns finish.
      if (sequence.expectedPlayers.size > 0 &&
          sequence.countdownCompletePlayers.size === sequence.expectedPlayers.size &&
          !sequence.timerStarted) {

        sequence.timerStarted = true;
        sequence.timerStartedAt = Date.now();

        // Clear timeouts
        if (sequence.ackTimeout) {
          clearTimeout(sequence.ackTimeout);
          sequence.ackTimeout = null;
        }
        if (sequence.countdownTimeout) {
          clearTimeout(sequence.countdownTimeout);
          sequence.countdownTimeout = null;
        }
        this.clearRetryTimeouts(sequence);

        logger.debug('GAME_START', 'All remaining players ready after disconnect');
        return { startTimer: true };
      }
    }

    return { startTimer: false };
  }

  /**
   * Schedule intelligent retries for failed players
   */
  scheduleRetries(gameCode: string, failedUsernames: string[], sendFunction: SendFunction): void {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence || sequence.cancelled || sequence.timerStarted) {
      return;
    }

    const retryDelays = [100, 200, 400, 800]; // Exponential backoff

    failedUsernames.forEach(username => {
      // Skip if player already acknowledged
      if (sequence.acknowledgedPlayers.has(username)) {
        return;
      }

      // Track failed player
      sequence.failedPlayers.add(username);

      // Initialize retry count
      if (!sequence.retryAttempts.has(username)) {
        sequence.retryAttempts.set(username, 0);
      }

      const scheduleRetry = (attemptNumber: number): void => {
        if (attemptNumber >= retryDelays.length) {
          logger.debug('GAME_START', `Max retries reached for ${username}`);
          return;
        }

        const delay = retryDelays[attemptNumber];
        const timeoutId = setTimeout(() => {
          const currentSequence = this.activeSequences.get(gameCode);

          // Check if we should still retry
          if (!currentSequence ||
              currentSequence.cancelled ||
              currentSequence.timerStarted ||
              currentSequence.acknowledgedPlayers.has(username) ||
              !currentSequence.expectedPlayers.has(username)) {
            return;
          }

          logger.debug('GAME_START', `Retry ${attemptNumber + 1} for ${username}`);

          // Attempt to resend
          const sent = sendFunction(username);

          if (!sent) {
            // Player still unreachable, schedule next retry
            scheduleRetry(attemptNumber + 1);
          } else {
            // Message sent, wait for acknowledgment
            currentSequence.retryAttempts.set(username, attemptNumber + 1);
          }
        }, delay);

        // Track the timeout so we can clear it later
        sequence.retryTimeouts.push(timeoutId);
      };

      // Start retry sequence
      scheduleRetry(0);
    });
  }

  /**
   * Record that a player has finished their pre-game countdown animation.
   * Independent of acknowledgment: ack confirms delivery (drives retries),
   * countdownComplete confirms readiness to play (drives timer start).
   */
  recordCountdownComplete(gameCode: string, username: string, messageId: string): AcknowledgmentResult {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence) {
      return { valid: false, reason: 'no_active_sequence' };
    }
    if (sequence.cancelled) {
      return { valid: false, reason: 'sequence_cancelled' };
    }
    if (sequence.messageId !== messageId) {
      return { valid: false, reason: 'wrong_message_id' };
    }
    if (sequence.timerStarted) {
      return { valid: true, reason: 'timer_already_started', late: true };
    }
    if (!sequence.expectedPlayers.has(username)) {
      return { valid: false, reason: 'unexpected_player' };
    }
    if (sequence.countdownCompletePlayers.has(username)) {
      return { valid: true, reason: 'already_completed', duplicate: true, allReady: false };
    }

    sequence.countdownCompletePlayers.add(username);

    const completedCount = sequence.countdownCompletePlayers.size;
    const expectedCount = sequence.expectedPlayers.size;
    const allReady = completedCount === expectedCount;

    if (allReady && !sequence.timerStarted) {
      sequence.timerStarted = true;
      sequence.timerStartedAt = Date.now();

      if (sequence.countdownTimeout) {
        clearTimeout(sequence.countdownTimeout);
        sequence.countdownTimeout = null;
      }
      if (sequence.ackTimeout) {
        clearTimeout(sequence.ackTimeout);
        sequence.ackTimeout = null;
      }
      this.clearRetryTimeouts(sequence);
    }

    return { valid: true, allReady, acknowledgedCount: completedCount, expectedCount };
  }

  /**
   * Fallback timer for countdown completion. If a client never reports
   * countdownComplete (network drop, broken animation), start anyway.
   */
  setCountdownCompleteTimeout(gameCode: string, timeoutMs: number, onTimeout: TimeoutCallback): void {
    const sequence = this.activeSequences.get(gameCode);
    if (!sequence || sequence.cancelled) return;

    sequence.countdownTimeout = setTimeout(() => {
      const current = this.activeSequences.get(gameCode);
      if (!current || current.cancelled || current.timerStarted || !current.countdownTimeout) return;

      current.timerStarted = true;
      current.timerStartedAt = Date.now();
      this.clearRetryTimeouts(current);

      const missing = Array.from(current.expectedPlayers).filter(
        u => !current.countdownCompletePlayers.has(u)
      );
      const stats: TimeoutStats = {
        acknowledged: current.countdownCompletePlayers.size,
        expected: current.expectedPlayers.size,
        missing,
        waitTime: current.timerStartedAt - current.startedAt,
      };
      logger.info('GAME_START', `Countdown timeout. Starting with ${stats.acknowledged}/${stats.expected} ready. Missing: ${missing.join(', ')}`);
      onTimeout(stats);
    }, timeoutMs);
  }

  /**
   * Set timeout for waiting for acknowledgments
   */
  setAcknowledgmentTimeout(gameCode: string, timeoutMs: number, onTimeout: TimeoutCallback): void {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence || sequence.cancelled) {
      return;
    }

    sequence.ackTimeout = setTimeout(() => {
      const currentSequence = this.activeSequences.get(gameCode);

      // Guard: sequence gone, cancelled, timer already started, or ackTimeout was cleared by another path
      if (!currentSequence || currentSequence.cancelled || currentSequence.timerStarted || !currentSequence.ackTimeout) {
        return;
      }

      currentSequence.timerStarted = true;
      currentSequence.timerStartedAt = Date.now();

      // Clear retry timeouts
      this.clearRetryTimeouts(currentSequence);

      const missing = Array.from(currentSequence.expectedPlayers).filter(
        username => !currentSequence.acknowledgedPlayers.has(username)
      );

      const stats: TimeoutStats = {
        acknowledged: currentSequence.acknowledgedPlayers.size,
        expected: currentSequence.expectedPlayers.size,
        missing: missing,
        waitTime: currentSequence.timerStartedAt - currentSequence.startedAt
      };

      logger.info('GAME_START', `Timeout reached. Starting with ${stats.acknowledged}/${stats.expected} players ready. Missing: ${missing.join(', ')}`);

      onTimeout(stats);
    }, timeoutMs);
  }

  /**
   * Clear all retry timeouts for a sequence
   */
  private clearRetryTimeouts(sequence: GameStartSequence): void {
    if (sequence.retryTimeouts && sequence.retryTimeouts.length > 0) {
      sequence.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      sequence.retryTimeouts = [];
    }
  }

  /**
   * Cancel an active sequence
   */
  cancelSequence(gameCode: string): void {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence) {
      return;
    }

    logger.debug('GAME_START', `Cancelling sequence for game ${gameCode}`);

    sequence.cancelled = true;

    // Clear all timeouts
    if (sequence.ackTimeout) {
      clearTimeout(sequence.ackTimeout);
      sequence.ackTimeout = null;
    }
    if (sequence.countdownTimeout) {
      clearTimeout(sequence.countdownTimeout);
      sequence.countdownTimeout = null;
    }

    this.clearRetryTimeouts(sequence);

    // Remove from active sequences
    this.activeSequences.delete(gameCode);
  }

  /**
   * Clean up a sequence completely
   */
  cleanupSequence(gameCode: string): void {
    this.cancelSequence(gameCode);
  }

  /**
   * Get sequence statistics
   */
  getSequenceStats(gameCode: string): SequenceStats | null {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence) {
      return null;
    }

    return {
      messageId: sequence.messageId,
      startedAt: sequence.startedAt,
      timerStarted: sequence.timerStarted,
      timerStartedAt: sequence.timerStartedAt,
      acknowledged: Array.from(sequence.acknowledgedPlayers),
      missing: Array.from(sequence.expectedPlayers).filter(
        u => !sequence.acknowledgedPlayers.has(u)
      ),
      failed: Array.from(sequence.failedPlayers),
      acknowledgedCount: sequence.acknowledgedPlayers.size,
      expectedCount: sequence.expectedPlayers.size,
      waitTime: sequence.timerStartedAt ? sequence.timerStartedAt - sequence.startedAt : null
    };
  }

  /**
   * Check if a game has an active sequence
   */
  hasActiveSequence(gameCode: string): boolean {
    return this.activeSequences.has(gameCode);
  }

  /**
   * Clear all active sequences (for graceful shutdown or tests).
   * Cancels all timeouts to prevent orphaned callbacks.
   */
  clearAll(): void {
    for (const gameCode of Array.from(this.activeSequences.keys())) {
      this.cancelSequence(gameCode);
    }
  }
}

// Export singleton instance
const gameStartCoordinator = new GameStartCoordinator();
export default gameStartCoordinator;
export { GameStartCoordinator };
export type { GameStartSequence, AcknowledgmentResult, DisconnectResult, TimeoutStats, SequenceStats };

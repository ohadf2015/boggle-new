/**
 * Game Start Coordinator - Production-ready acknowledgment system
 * Ensures all players are ready before starting game timer
 */

class GameStartCoordinator {
  constructor() {
    // Track active game start sequences
    this.activeSequences = new Map(); // gameCode -> sequence data
  }

  /**
   * Initialize a new game start sequence
   */
  initializeSequence(gameCode, players, timerSeconds) {
    // Clean up any existing sequence for this game
    this.cleanupSequence(gameCode);

    const messageId = `start-${gameCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const sequence = {
      messageId,
      gameCode,
      timerSeconds,
      startedAt: Date.now(),
      expectedPlayers: new Set(players), // Use Set for O(1) lookups
      acknowledgedPlayers: new Set(),
      failedPlayers: new Set(),
      retryTimeouts: [], // Track all retry timeouts
      ackTimeout: null,
      timerStarted: false,
      timerStartedAt: null,
      cancelled: false,
      retryAttempts: new Map(), // username -> retry count
    };

    this.activeSequences.set(gameCode, sequence);

    console.log(`[GAME_START_COORD] Initialized sequence ${messageId} for game ${gameCode} with ${players.length} players`);

    return messageId;
  }

  /**
   * Record player acknowledgment
   * Returns true if this was the final needed acknowledgment
   */
  recordAcknowledgment(gameCode, username, messageId) {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence) {
      console.warn(`[GAME_START_COORD] No active sequence for game ${gameCode}`);
      return { valid: false, reason: 'no_active_sequence' };
    }

    if (sequence.cancelled) {
      console.warn(`[GAME_START_COORD] Sequence cancelled for game ${gameCode}`);
      return { valid: false, reason: 'sequence_cancelled' };
    }

    if (sequence.messageId !== messageId) {
      console.warn(`[GAME_START_COORD] Wrong messageId from ${username}. Expected: ${sequence.messageId}, Got: ${messageId}`);
      return { valid: false, reason: 'wrong_message_id' };
    }

    if (sequence.timerStarted) {
      console.log(`[GAME_START_COORD] Late acknowledgment from ${username} - timer already started`);
      return { valid: true, reason: 'timer_already_started', late: true };
    }

    if (!sequence.expectedPlayers.has(username)) {
      console.warn(`[GAME_START_COORD] Unexpected player ${username} acknowledged`);
      return { valid: false, reason: 'unexpected_player' };
    }

    if (sequence.acknowledgedPlayers.has(username)) {
      console.log(`[GAME_START_COORD] Duplicate acknowledgment from ${username}`);
      return { valid: true, reason: 'already_acknowledged', duplicate: true };
    }

    // Record the acknowledgment
    sequence.acknowledgedPlayers.add(username);
    sequence.failedPlayers.delete(username); // Remove from failed list if present

    const ackCount = sequence.acknowledgedPlayers.size;
    const expectedCount = sequence.expectedPlayers.size;

    console.log(`[GAME_START_COORD] Acknowledgment from ${username} (${ackCount}/${expectedCount})`);

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
      console.log(`[GAME_START_COORD] All players ready! Starting timer after ${waitTime}ms wait`);

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
  handlePlayerDisconnect(gameCode, username) {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence || sequence.cancelled || sequence.timerStarted) {
      return;
    }

    if (sequence.expectedPlayers.has(username)) {
      console.log(`[GAME_START_COORD] Player ${username} disconnected during start sequence`);

      // Remove from expected players
      sequence.expectedPlayers.delete(username);
      sequence.acknowledgedPlayers.delete(username);
      sequence.failedPlayers.delete(username);

      // Check if we now have all remaining players ready
      if (sequence.expectedPlayers.size > 0 &&
          sequence.acknowledgedPlayers.size === sequence.expectedPlayers.size &&
          !sequence.timerStarted) {

        sequence.timerStarted = true;
        sequence.timerStartedAt = Date.now();

        // Clear timeouts
        if (sequence.ackTimeout) {
          clearTimeout(sequence.ackTimeout);
          sequence.ackTimeout = null;
        }
        this.clearRetryTimeouts(sequence);

        console.log(`[GAME_START_COORD] All remaining players ready after disconnect`);
        return { startTimer: true };
      }
    }

    return { startTimer: false };
  }

  /**
   * Schedule intelligent retries for failed players
   */
  scheduleRetries(gameCode, failedUsernames, sendFunction) {
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

      const scheduleRetry = (attemptNumber) => {
        if (attemptNumber >= retryDelays.length) {
          console.log(`[GAME_START_COORD] Max retries reached for ${username}`);
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

          console.log(`[GAME_START_COORD] Retry ${attemptNumber + 1} for ${username}`);

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
   * Set timeout for waiting for acknowledgments
   */
  setAcknowledgmentTimeout(gameCode, timeoutMs, onTimeout) {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence || sequence.cancelled) {
      return;
    }

    sequence.ackTimeout = setTimeout(() => {
      const currentSequence = this.activeSequences.get(gameCode);

      if (!currentSequence || currentSequence.cancelled || currentSequence.timerStarted) {
        return;
      }

      currentSequence.timerStarted = true;
      currentSequence.timerStartedAt = Date.now();

      // Clear retry timeouts
      this.clearRetryTimeouts(currentSequence);

      const missing = Array.from(currentSequence.expectedPlayers).filter(
        username => !currentSequence.acknowledgedPlayers.has(username)
      );

      const stats = {
        acknowledged: currentSequence.acknowledgedPlayers.size,
        expected: currentSequence.expectedPlayers.size,
        missing: missing,
        waitTime: currentSequence.timerStartedAt - currentSequence.startedAt
      };

      console.log(`[GAME_START_COORD] Timeout reached. Starting with ${stats.acknowledged}/${stats.expected} players ready`);
      console.log(`[GAME_START_COORD] Missing players: ${missing.join(', ')}`);

      onTimeout(stats);
    }, timeoutMs);
  }

  /**
   * Clear all retry timeouts for a sequence
   */
  clearRetryTimeouts(sequence) {
    if (sequence.retryTimeouts && sequence.retryTimeouts.length > 0) {
      sequence.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      sequence.retryTimeouts = [];
    }
  }

  /**
   * Cancel an active sequence
   */
  cancelSequence(gameCode) {
    const sequence = this.activeSequences.get(gameCode);

    if (!sequence) {
      return;
    }

    console.log(`[GAME_START_COORD] Cancelling sequence for game ${gameCode}`);

    sequence.cancelled = true;

    // Clear all timeouts
    if (sequence.ackTimeout) {
      clearTimeout(sequence.ackTimeout);
      sequence.ackTimeout = null;
    }

    this.clearRetryTimeouts(sequence);

    // Remove from active sequences
    this.activeSequences.delete(gameCode);
  }

  /**
   * Clean up a sequence completely
   */
  cleanupSequence(gameCode) {
    this.cancelSequence(gameCode);
  }

  /**
   * Get sequence statistics
   */
  getSequenceStats(gameCode) {
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
  hasActiveSequence(gameCode) {
    return this.activeSequences.has(gameCode);
  }
}

// Export singleton instance
module.exports = new GameStartCoordinator();
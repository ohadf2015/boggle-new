/**
 * Spam Detector Module
 * Tracks invalid word submissions and applies progressive penalties
 *
 * Penalty Tiers:
 * - WARNING (5 invalid): Show warning message
 * - PENALTY (7 invalid): -2 points per additional invalid word
 * - COOLDOWN (10 invalid): 3-second block + combo reset
 */

const logger = require('../utils/logger');

// Configuration
const WINDOW_MS = 10000; // 10-second sliding window
const WARNING_THRESHOLD = 5; // 5 invalid words = warning
const PENALTY_THRESHOLD = 7; // 7 invalid words = point deductions
const COOLDOWN_THRESHOLD = 10; // 10 invalid words = cooldown
const COOLDOWN_DURATION_MS = 3000; // 3-second cooldown
const PENALTY_POINTS = 2; // Points deducted per invalid word above threshold

// Penalty tier enum
const PenaltyTier = {
  NONE: 'none',
  WARNING: 'warning',
  PENALTY: 'penalty',
  COOLDOWN: 'cooldown'
};

// Reason enum for invalid words
const InvalidReason = {
  NOT_ON_BOARD: 'not_on_board',
  TOO_SHORT: 'too_short',
  PROFANITY: 'profanity',
  REJECTED: 'rejected'
};

/**
 * Spam Detector class
 * Tracks invalid submissions per player with sliding window
 */
class SpamDetector {
  constructor(options = {}) {
    this.windowMs = options.windowMs || WINDOW_MS;
    this.warningThreshold = options.warningThreshold || WARNING_THRESHOLD;
    this.penaltyThreshold = options.penaltyThreshold || PENALTY_THRESHOLD;
    this.cooldownThreshold = options.cooldownThreshold || COOLDOWN_THRESHOLD;
    this.cooldownDurationMs = options.cooldownDurationMs || COOLDOWN_DURATION_MS;
    this.penaltyPoints = options.penaltyPoints || PENALTY_POINTS;

    // playerKey (gameCode:username) -> { invalidWords: [{timestamp, reason}], cooldownUntil: number }
    this.playerData = new Map();

    // Cleanup interval - run every 30 seconds
    this.cleanupInterval = setInterval(() => this._cleanup(), 30000);
    this.cleanupInterval.unref();
  }

  /**
   * Generate player key
   * @param {string} gameCode - Game code
   * @param {string} username - Player username
   * @returns {string} - Combined key
   */
  _getPlayerKey(gameCode, username) {
    return `${gameCode}:${username}`;
  }

  /**
   * Get or create player data
   * @param {string} gameCode - Game code
   * @param {string} username - Player username
   * @returns {object} - Player spam data
   */
  _getPlayerData(gameCode, username) {
    const key = this._getPlayerKey(gameCode, username);
    if (!this.playerData.has(key)) {
      this.playerData.set(key, {
        invalidWords: [],
        cooldownUntil: 0,
        lastWarningTime: 0,
        lastPenaltyCount: 0,
        totalPenaltyPoints: 0
      });
    }
    return this.playerData.get(key);
  }

  /**
   * Prune expired entries from player's invalid word list
   * @param {object} data - Player data object
   */
  _pruneExpiredEntries(data) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    data.invalidWords = data.invalidWords.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Record an invalid word submission
   * @param {string} gameCode - Game code
   * @param {string} username - Player username
   * @param {string} word - The invalid word
   * @param {string} reason - Reason for invalidity (from InvalidReason enum)
   * @returns {object} - { tier, invalidCount, penaltyApplied, cooldownDuration, message }
   */
  recordInvalidWord(gameCode, username, word, reason = InvalidReason.REJECTED) {
    const data = this._getPlayerData(gameCode, username);
    const now = Date.now();

    // Prune old entries
    this._pruneExpiredEntries(data);

    // Add new entry
    data.invalidWords.push({
      timestamp: now,
      word,
      reason
    });

    const invalidCount = data.invalidWords.length;
    const tier = this._calculateTier(invalidCount);
    const result = {
      tier,
      invalidCount,
      penaltyApplied: 0,
      cooldownDuration: 0,
      cooldownActive: this.isOnCooldown(gameCode, username),
      message: null
    };

    // Apply tier-specific actions
    switch (tier) {
      case PenaltyTier.WARNING:
        // Only emit warning once per window
        if (now - data.lastWarningTime > this.windowMs) {
          data.lastWarningTime = now;
          result.message = 'warning';
          logger.info('SPAM', `Warning issued to ${username} in ${gameCode} (${invalidCount} invalid words)`);
        }
        break;

      case PenaltyTier.PENALTY:
        // Calculate penalty for words above penalty threshold
        const penaltyWordCount = invalidCount - this.penaltyThreshold + 1;
        // Only apply penalty for NEW invalid words (not previously penalized)
        const newPenaltyCount = invalidCount - data.lastPenaltyCount;
        if (newPenaltyCount > 0 && invalidCount > this.penaltyThreshold) {
          const pointsToDeduct = this.penaltyPoints * newPenaltyCount;
          data.totalPenaltyPoints += pointsToDeduct;
          data.lastPenaltyCount = invalidCount;
          result.penaltyApplied = pointsToDeduct;
          result.totalPenaltyPoints = data.totalPenaltyPoints;
          result.message = 'penalty';
          logger.info('SPAM', `Penalty applied to ${username} in ${gameCode}: -${pointsToDeduct} points`);
        }
        break;

      case PenaltyTier.COOLDOWN:
        // Apply cooldown if not already active
        if (!result.cooldownActive) {
          data.cooldownUntil = now + this.cooldownDurationMs;
          result.cooldownDuration = this.cooldownDurationMs;
          result.cooldownActive = true;
          result.message = 'cooldown';
          logger.info('SPAM', `Cooldown applied to ${username} in ${gameCode} for ${this.cooldownDurationMs}ms`);
        }
        break;
    }

    return result;
  }

  /**
   * Calculate penalty tier based on invalid count
   * @param {number} invalidCount - Number of invalid words in window
   * @returns {string} - PenaltyTier value
   */
  _calculateTier(invalidCount) {
    if (invalidCount >= this.cooldownThreshold) {
      return PenaltyTier.COOLDOWN;
    }
    if (invalidCount >= this.penaltyThreshold) {
      return PenaltyTier.PENALTY;
    }
    if (invalidCount >= this.warningThreshold) {
      return PenaltyTier.WARNING;
    }
    return PenaltyTier.NONE;
  }

  /**
   * Check if player is currently on cooldown
   * @param {string} gameCode - Game code
   * @param {string} username - Player username
   * @returns {boolean} - True if on cooldown
   */
  isOnCooldown(gameCode, username) {
    const key = this._getPlayerKey(gameCode, username);
    const data = this.playerData.get(key);
    if (!data) return false;

    const now = Date.now();
    if (data.cooldownUntil > now) {
      return true;
    }
    return false;
  }

  /**
   * Get remaining cooldown time in ms
   * @param {string} gameCode - Game code
   * @param {string} username - Player username
   * @returns {number} - Remaining ms, or 0 if not on cooldown
   */
  getRemainingCooldown(gameCode, username) {
    const key = this._getPlayerKey(gameCode, username);
    const data = this.playerData.get(key);
    if (!data) return 0;

    const now = Date.now();
    if (data.cooldownUntil > now) {
      return data.cooldownUntil - now;
    }
    return 0;
  }

  /**
   * Get current penalty tier for a player
   * @param {string} gameCode - Game code
   * @param {string} username - Player username
   * @returns {object} - { tier, invalidCount, cooldownRemaining }
   */
  getPlayerStatus(gameCode, username) {
    const data = this._getPlayerData(gameCode, username);
    this._pruneExpiredEntries(data);

    const invalidCount = data.invalidWords.length;
    const tier = this._calculateTier(invalidCount);
    const cooldownRemaining = this.getRemainingCooldown(gameCode, username);

    return {
      tier,
      invalidCount,
      cooldownRemaining,
      totalPenaltyPoints: data.totalPenaltyPoints
    };
  }

  /**
   * Clear player spam data (call when game ends or player leaves)
   * @param {string} gameCode - Game code
   * @param {string} username - Player username
   */
  clearPlayer(gameCode, username) {
    const key = this._getPlayerKey(gameCode, username);
    this.playerData.delete(key);
  }

  /**
   * Clear all spam data for a game (call when game ends)
   * @param {string} gameCode - Game code
   */
  clearGame(gameCode) {
    const prefix = `${gameCode}:`;
    for (const key of this.playerData.keys()) {
      if (key.startsWith(prefix)) {
        this.playerData.delete(key);
      }
    }
    logger.debug('SPAM', `Cleared spam data for game ${gameCode}`);
  }

  /**
   * Clean up stale entries
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [key, data] of this.playerData) {
      // Prune expired entries
      this._pruneExpiredEntries(data);

      // Remove if no recent activity and no active cooldown
      const lastActivity = data.invalidWords.length > 0
        ? Math.max(...data.invalidWords.map(e => e.timestamp))
        : 0;

      if (now - lastActivity > staleThreshold && data.cooldownUntil < now) {
        this.playerData.delete(key);
      }
    }
  }

  /**
   * Get statistics
   * @returns {object} - Current stats
   */
  getStats() {
    return {
      trackedPlayers: this.playerData.size,
      config: {
        windowMs: this.windowMs,
        warningThreshold: this.warningThreshold,
        penaltyThreshold: this.penaltyThreshold,
        cooldownThreshold: this.cooldownThreshold,
        cooldownDurationMs: this.cooldownDurationMs,
        penaltyPoints: this.penaltyPoints
      }
    };
  }

  /**
   * Shutdown - clear intervals
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create singleton instance with env-configurable options
const spamDetector = new SpamDetector({
  windowMs: parseInt(process.env.SPAM_WINDOW_MS || WINDOW_MS.toString()),
  warningThreshold: parseInt(process.env.SPAM_WARNING_THRESHOLD || WARNING_THRESHOLD.toString()),
  penaltyThreshold: parseInt(process.env.SPAM_PENALTY_THRESHOLD || PENALTY_THRESHOLD.toString()),
  cooldownThreshold: parseInt(process.env.SPAM_COOLDOWN_THRESHOLD || COOLDOWN_THRESHOLD.toString()),
  cooldownDurationMs: parseInt(process.env.SPAM_COOLDOWN_DURATION_MS || COOLDOWN_DURATION_MS.toString()),
  penaltyPoints: parseInt(process.env.SPAM_PENALTY_POINTS || PENALTY_POINTS.toString())
});

module.exports = {
  SpamDetector,
  spamDetector,
  PenaltyTier,
  InvalidReason
};

/**
 * Spam Detector Module
 * Tracks invalid word submissions and applies progressive penalties
 *
 * Penalty Tiers:
 * - WARNING (5 invalid): Show warning message
 * - PENALTY (7 invalid): -2 points per additional invalid word
 * - COOLDOWN (10 invalid): 3-second block + combo reset
 */

 
import logger from '../utils/logger';

// Interfaces
export interface InvalidWordEntry {
  timestamp: number;
  word: string;
  reason: string;
}

export interface PlayerSpamData {
  invalidWords: InvalidWordEntry[];
  cooldownUntil: number;
  lastWarningTime: number;
  lastPenaltyCount: number;
  totalPenaltyPoints: number;
}

export interface RecordInvalidWordResult {
  tier: PenaltyTierValue;
  invalidCount: number;
  penaltyApplied: number;
  cooldownDuration: number;
  cooldownActive: boolean;
  message: string | null;
  totalPenaltyPoints?: number;
}

export interface PlayerStatus {
  tier: PenaltyTierValue;
  invalidCount: number;
  cooldownRemaining: number;
  totalPenaltyPoints: number;
}

export interface SpamDetectorOptions {
  windowMs?: number;
  warningThreshold?: number;
  penaltyThreshold?: number;
  cooldownThreshold?: number;
  cooldownDurationMs?: number;
  penaltyPoints?: number;
}

export interface SpamDetectorStats {
  trackedPlayers: number;
  config: {
    windowMs: number;
    warningThreshold: number;
    penaltyThreshold: number;
    cooldownThreshold: number;
    cooldownDurationMs: number;
    penaltyPoints: number;
  };
}

// Configuration
const WINDOW_MS = 10000; // 10-second sliding window
const WARNING_THRESHOLD = 5; // 5 invalid words = warning
const PENALTY_THRESHOLD = 7; // 7 invalid words = point deductions
const COOLDOWN_THRESHOLD = 10; // 10 invalid words = cooldown
const COOLDOWN_DURATION_MS = 3000; // 3-second cooldown
const PENALTY_POINTS = 2; // Points deducted per invalid word above threshold

// Penalty tier enum
export const PenaltyTier = {
  NONE: 'none',
  WARNING: 'warning',
  PENALTY: 'penalty',
  COOLDOWN: 'cooldown'
} as const;

export type PenaltyTierValue = typeof PenaltyTier[keyof typeof PenaltyTier];

// Reason enum for invalid words
export const InvalidReason = {
  NOT_ON_BOARD: 'not_on_board',
  TOO_SHORT: 'too_short',
  PROFANITY: 'profanity',
  REJECTED: 'rejected',
  INVALID_SHAPE: 'invalid_shape'
} as const;

export type InvalidReasonValue = typeof InvalidReason[keyof typeof InvalidReason];

/**
 * Spam Detector class
 * Tracks invalid submissions per player with sliding window
 */
export class SpamDetector {
  private windowMs: number;
  private warningThreshold: number;
  private penaltyThreshold: number;
  private cooldownThreshold: number;
  private cooldownDurationMs: number;
  private penaltyPoints: number;
  private playerData: Map<string, PlayerSpamData>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(options: SpamDetectorOptions = {}) {
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
   */
  private _getPlayerKey(gameCode: string, username: string): string {
    return `${gameCode}:${username}`;
  }

  /**
   * Get or create player data
   */
  private _getPlayerData(gameCode: string, username: string): PlayerSpamData {
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
    return this.playerData.get(key)!;
  }

  /**
   * Prune expired entries from player's invalid word list
   */
  private _pruneExpiredEntries(data: PlayerSpamData): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    data.invalidWords = data.invalidWords.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Record an invalid word submission
   */
  recordInvalidWord(
    gameCode: string,
    username: string,
    word: string,
    reason: InvalidReasonValue = InvalidReason.REJECTED
  ): RecordInvalidWordResult {
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
    const result: RecordInvalidWordResult = {
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
   */
  private _calculateTier(invalidCount: number): PenaltyTierValue {
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
   */
  isOnCooldown(gameCode: string, username: string): boolean {
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
   */
  getRemainingCooldown(gameCode: string, username: string): number {
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
   */
  getPlayerStatus(gameCode: string, username: string): PlayerStatus {
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
   */
  clearPlayer(gameCode: string, username: string): void {
    const key = this._getPlayerKey(gameCode, username);
    this.playerData.delete(key);
  }

  /**
   * Clear all spam data for a game (call when game ends)
   */
  clearGame(gameCode: string): void {
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
   */
  private _cleanup(): void {
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
   */
  getStats(): SpamDetectorStats {
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
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create singleton instance with env-configurable options
export const spamDetector = new SpamDetector({
  windowMs: parseInt(process.env.SPAM_WINDOW_MS || WINDOW_MS.toString()),
  warningThreshold: parseInt(process.env.SPAM_WARNING_THRESHOLD || WARNING_THRESHOLD.toString()),
  penaltyThreshold: parseInt(process.env.SPAM_PENALTY_THRESHOLD || PENALTY_THRESHOLD.toString()),
  cooldownThreshold: parseInt(process.env.SPAM_COOLDOWN_THRESHOLD || COOLDOWN_THRESHOLD.toString()),
  cooldownDurationMs: parseInt(process.env.SPAM_COOLDOWN_DURATION_MS || COOLDOWN_DURATION_MS.toString()),
  penaltyPoints: parseInt(process.env.SPAM_PENALTY_POINTS || PENALTY_POINTS.toString())
});


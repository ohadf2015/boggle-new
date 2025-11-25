/**
 * Game Start Monitor - Production monitoring and debugging
 * Tracks game start performance and identifies issues
 */

class GameStartMonitor {
  constructor() {
    // Track recent game starts for analysis
    this.recentStarts = []; // Keep last 100 game starts
    this.maxHistory = 100;

    // Track failure patterns
    this.failurePatterns = new Map(); // pattern -> count

    // Performance metrics
    this.performanceStats = {
      totalStarts: 0,
      successfulStarts: 0,
      partialStarts: 0,
      failedStarts: 0,
      averageWaitTime: 0,
      maxWaitTime: 0,
      minWaitTime: Infinity,
      playerCounts: new Map(), // player count -> frequency
      acknowledgmentRates: [], // success rates
    };
  }

  /**
   * Record a game start event
   */
  recordGameStart(gameCode, playerCount, acknowledgedCount, waitTimeMs, missingPlayers = []) {
    const timestamp = Date.now();
    const success = playerCount === acknowledgedCount;
    const partial = acknowledgedCount > 0 && acknowledgedCount < playerCount;

    const record = {
      timestamp,
      gameCode,
      playerCount,
      acknowledgedCount,
      missingPlayers,
      waitTimeMs,
      success,
      partial,
      acknowledgmentRate: (acknowledgedCount / playerCount) * 100,
    };

    // Add to recent starts
    this.recentStarts.push(record);
    if (this.recentStarts.length > this.maxHistory) {
      this.recentStarts.shift();
    }

    // Update statistics
    this.updateStatistics(record);

    // Detect patterns
    this.detectFailurePatterns(record);

    // Log if there are issues
    if (!success) {
      this.logIssue(record);
    }

    return record;
  }

  /**
   * Update performance statistics
   */
  updateStatistics(record) {
    this.performanceStats.totalStarts++;

    if (record.success) {
      this.performanceStats.successfulStarts++;
    } else if (record.partial) {
      this.performanceStats.partialStarts++;
    } else {
      this.performanceStats.failedStarts++;
    }

    // Update wait time stats
    if (record.waitTimeMs !== null) {
      const currentAvg = this.performanceStats.averageWaitTime;
      const totalStarts = this.performanceStats.totalStarts;
      this.performanceStats.averageWaitTime =
        (currentAvg * (totalStarts - 1) + record.waitTimeMs) / totalStarts;

      this.performanceStats.maxWaitTime = Math.max(
        this.performanceStats.maxWaitTime,
        record.waitTimeMs
      );

      this.performanceStats.minWaitTime = Math.min(
        this.performanceStats.minWaitTime,
        record.waitTimeMs
      );
    }

    // Track player count distribution
    const playerCountFreq = this.performanceStats.playerCounts.get(record.playerCount) || 0;
    this.performanceStats.playerCounts.set(record.playerCount, playerCountFreq + 1);

    // Track acknowledgment rates
    this.performanceStats.acknowledgmentRates.push(record.acknowledgmentRate);
    if (this.performanceStats.acknowledgmentRates.length > 100) {
      this.performanceStats.acknowledgmentRates.shift();
    }
  }

  /**
   * Detect common failure patterns
   */
  detectFailurePatterns(record) {
    if (record.success) {
      return;
    }

    // Pattern 1: High player count failures
    if (record.playerCount >= 4 && record.acknowledgmentRate < 75) {
      this.incrementPattern('high_player_count_failure');
    }

    // Pattern 2: Complete failures (no acknowledgments)
    if (record.acknowledgedCount === 0) {
      this.incrementPattern('complete_failure');
    }

    // Pattern 3: Specific players frequently missing
    record.missingPlayers.forEach(player => {
      this.incrementPattern(`player_missing:${player}`);
    });

    // Pattern 4: Timeout pattern (all failures at max wait time)
    if (record.waitTimeMs >= 2900 && record.waitTimeMs <= 3100) {
      this.incrementPattern('timeout_failure');
    }

    // Pattern 5: Network issues (multiple players from same game failing)
    const recentSameGame = this.recentStarts.filter(
      r => r.gameCode === record.gameCode &&
           r.timestamp > timestamp - 60000 && // Within last minute
           !r.success
    );
    if (recentSameGame.length >= 2) {
      this.incrementPattern(`game_recurring_failure:${record.gameCode}`);
    }
  }

  /**
   * Increment a failure pattern counter
   */
  incrementPattern(pattern) {
    const count = this.failurePatterns.get(pattern) || 0;
    this.failurePatterns.set(pattern, count + 1);

    // Alert on critical patterns
    if (pattern === 'complete_failure' && (count + 1) % 5 === 0) {
      console.error(`[ALERT] Multiple complete failures detected: ${count + 1} occurrences`);
    }
  }

  /**
   * Log an issue for debugging
   */
  logIssue(record) {
    const severity = record.acknowledgedCount === 0 ? 'ERROR' : 'WARN';

    console.log(`[${severity}] Game start issue:`, {
      gameCode: record.gameCode,
      success: `${record.acknowledgedCount}/${record.playerCount} players`,
      missing: record.missingPlayers.join(', '),
      waitTime: `${record.waitTimeMs}ms`,
      rate: `${record.acknowledgmentRate.toFixed(1)}%`
    });
  }

  /**
   * Get current statistics
   */
  getStatistics() {
    const stats = { ...this.performanceStats };

    // Calculate success rate
    stats.successRate = stats.totalStarts > 0
      ? (stats.successfulStarts / stats.totalStarts) * 100
      : 0;

    // Calculate average acknowledgment rate
    stats.averageAckRate = stats.acknowledgmentRates.length > 0
      ? stats.acknowledgmentRates.reduce((a, b) => a + b, 0) / stats.acknowledgmentRates.length
      : 0;

    // Get top failure patterns
    stats.topFailurePatterns = Array.from(this.failurePatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));

    // Get player count distribution
    stats.playerCountDistribution = Array.from(stats.playerCounts.entries())
      .map(([count, frequency]) => ({ playerCount: count, frequency }))
      .sort((a, b) => a.playerCount - b.playerCount);

    return stats;
  }

  /**
   * Get recent failures for debugging
   */
  getRecentFailures(limit = 10) {
    return this.recentStarts
      .filter(r => !r.success)
      .slice(-limit)
      .reverse()
      .map(r => ({
        ...r,
        timestampFormatted: new Date(r.timestamp).toISOString()
      }));
  }

  /**
   * Check system health
   */
  checkHealth() {
    const stats = this.getStatistics();
    const health = {
      status: 'healthy',
      issues: [],
      recommendations: []
    };

    // Check success rate
    if (stats.successRate < 90) {
      health.status = 'degraded';
      health.issues.push(`Low success rate: ${stats.successRate.toFixed(1)}%`);
    }

    if (stats.successRate < 70) {
      health.status = 'unhealthy';
    }

    // Check for complete failures
    const completeFailures = this.failurePatterns.get('complete_failure') || 0;
    if (completeFailures > 5) {
      health.status = 'unhealthy';
      health.issues.push(`Multiple complete failures: ${completeFailures}`);
      health.recommendations.push('Check WebSocket connectivity');
      health.recommendations.push('Verify broadcast function');
    }

    // Check for timeout patterns
    const timeoutFailures = this.failurePatterns.get('timeout_failure') || 0;
    if (timeoutFailures > 10) {
      health.issues.push(`High timeout rate: ${timeoutFailures} games`);
      health.recommendations.push('Consider increasing acknowledgment timeout');
      health.recommendations.push('Check network latency');
    }

    // Check average wait time
    if (stats.averageWaitTime > 2000) {
      health.issues.push(`High average wait time: ${stats.averageWaitTime.toFixed(0)}ms`);
      health.recommendations.push('Optimize message delivery');
    }

    // Check for problematic games
    const gameFailures = Array.from(this.failurePatterns.entries())
      .filter(([pattern]) => pattern.startsWith('game_recurring_failure:'))
      .map(([pattern, count]) => ({ game: pattern.split(':')[1], count }))
      .filter(({ count }) => count > 3);

    if (gameFailures.length > 0) {
      health.issues.push(`Recurring failures in games: ${gameFailures.map(g => g.game).join(', ')}`);
      health.recommendations.push('Check specific game state');
    }

    return health;
  }

  /**
   * Generate debug report
   */
  generateDebugReport() {
    const stats = this.getStatistics();
    const health = this.checkHealth();
    const recentFailures = this.getRecentFailures();

    return {
      timestamp: new Date().toISOString(),
      health,
      statistics: {
        totalGames: stats.totalStarts,
        successRate: `${stats.successRate.toFixed(1)}%`,
        averageAckRate: `${stats.averageAckRate.toFixed(1)}%`,
        averageWaitTime: `${stats.averageWaitTime.toFixed(0)}ms`,
        maxWaitTime: `${stats.maxWaitTime}ms`,
        playerCountDistribution: stats.playerCountDistribution,
        topFailurePatterns: stats.topFailurePatterns
      },
      recentFailures,
      recommendations: health.recommendations
    };
  }

  /**
   * Clear statistics (for testing)
   */
  clearStatistics() {
    this.recentStarts = [];
    this.failurePatterns.clear();
    this.performanceStats = {
      totalStarts: 0,
      successfulStarts: 0,
      partialStarts: 0,
      failedStarts: 0,
      averageWaitTime: 0,
      maxWaitTime: 0,
      minWaitTime: Infinity,
      playerCounts: new Map(),
      acknowledgmentRates: [],
    };
  }
}

// Export singleton instance
module.exports = new GameStartMonitor();
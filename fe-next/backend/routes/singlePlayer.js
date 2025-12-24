/**
 * Single Player Heartbeat API Routes
 * Tracks active single player sessions for admin visibility
 *
 * Uses in-memory storage for real-time counting only (no persistence)
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// ==================== In-Memory Session Storage ====================

/**
 * Active single player sessions
 * Map<sessionId, { timestamp, language, mode }>
 */
const activeSinglePlayers = new Map();

// Configuration
const STALE_THRESHOLD_MS = 60000;  // 60 seconds
const CLEANUP_INTERVAL_MS = 30000;  // 30 seconds

/**
 * Cleanup stale sessions periodically
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, data] of activeSinglePlayers) {
    if (now - data.timestamp > STALE_THRESHOLD_MS) {
      activeSinglePlayers.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('SINGLE_PLAYER', `Cleaned ${cleaned} stale sessions`);
  }
}, CLEANUP_INTERVAL_MS);

// ==================== Public API for Admin ====================

/**
 * Get count of active single player sessions
 * @returns {number} Active session count
 */
function getActiveSinglePlayerCount() {
  return activeSinglePlayers.size;
}

/**
 * Get breakdown by language
 * @returns {Record<string, number>} Count per language
 */
function getSinglePlayersByLanguage() {
  const counts = {};
  for (const [, data] of activeSinglePlayers) {
    const lang = data.language || 'en';
    counts[lang] = (counts[lang] || 0) + 1;
  }
  return counts;
}

/**
 * Get breakdown by mode
 * @returns {Record<string, number>} Count per mode
 */
function getSinglePlayersByMode() {
  const counts = {};
  for (const [, data] of activeSinglePlayers) {
    const mode = data.mode || 'unknown';
    counts[mode] = (counts[mode] || 0) + 1;
  }
  return counts;
}

// ==================== Routes ====================

/**
 * POST /api/single-player/heartbeat
 * Register or refresh a single player session
 *
 * Body: { sessionId: string, language?: string, mode?: string }
 */
router.post('/heartbeat', (req, res) => {
  try {
    const { sessionId, language, mode } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Update or create session
    activeSinglePlayers.set(sessionId, {
      timestamp: Date.now(),
      language: language || 'en',
      mode: mode || 'unknown'
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('SINGLE_PLAYER', `Heartbeat error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/single-player/heartbeat
 * Remove a single player session (on game end/unmount)
 *
 * Body: { sessionId: string }
 */
router.delete('/heartbeat', (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    activeSinglePlayers.delete(sessionId);
    res.json({ success: true });
  } catch (error) {
    logger.error('SINGLE_PLAYER', `Heartbeat delete error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/single-player/count
 * Get current active single player count (public endpoint for testing)
 */
router.get('/count', (_req, res) => {
  res.json({
    count: getActiveSinglePlayerCount(),
    byLanguage: getSinglePlayersByLanguage(),
    byMode: getSinglePlayersByMode(),
    timestamp: Date.now()
  });
});

// Export both router and utility functions
module.exports = router;
module.exports.getActiveSinglePlayerCount = getActiveSinglePlayerCount;
module.exports.getSinglePlayersByLanguage = getSinglePlayersByLanguage;
module.exports.getSinglePlayersByMode = getSinglePlayersByMode;

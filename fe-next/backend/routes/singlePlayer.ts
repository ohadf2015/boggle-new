/**
 * Single Player Heartbeat API Routes
 * Tracks active single player sessions for admin visibility
 *
 * Uses in-memory storage for real-time counting only (no persistence)
 */

import express, { Request, Response, Router } from 'express';
import logger from '../utils/logger';

const router: Router = express.Router();

// ==================== Types ====================

interface SessionData {
  timestamp: number;
  language: string;
  mode: string;
}

interface HeartbeatRequest extends Request {
  body: {
    sessionId?: string;
    language?: string;
    mode?: string;
  };
}

interface HeartbeatResponse {
  success: boolean;
  error?: string;
}

interface CountResponse {
  count: number;
  byLanguage: Record<string, number>;
  byMode: Record<string, number>;
  timestamp: number;
}

// ==================== In-Memory Session Storage ====================

/**
 * Active single player sessions
 * Map<sessionId, { timestamp, language, mode }>
 */
const activeSinglePlayers: Map<string, SessionData> = new Map();

// Configuration
const STALE_THRESHOLD_MS = 60000;  // 60 seconds
const CLEANUP_INTERVAL_MS = 30000;  // 30 seconds

/**
 * Cleanup stale sessions periodically
 */
setInterval((): void => {
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
 * @returns Active session count
 */
function getActiveSinglePlayerCount(): number {
  return activeSinglePlayers.size;
}

/**
 * Get breakdown by language
 * @returns Count per language
 */
function getSinglePlayersByLanguage(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [, data] of activeSinglePlayers) {
    const lang = data.language || 'en';
    counts[lang] = (counts[lang] || 0) + 1;
  }
  return counts;
}

/**
 * Get breakdown by mode
 * @returns Count per mode
 */
function getSinglePlayersByMode(): Record<string, number> {
  const counts: Record<string, number> = {};
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
router.post('/heartbeat', (req: HeartbeatRequest, res: Response): void => {
  try {
    const { sessionId, language, mode } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'sessionId is required' } as HeartbeatResponse);
      return;
    }

    // Update or create session
    activeSinglePlayers.set(sessionId, {
      timestamp: Date.now(),
      language: language || 'en',
      mode: mode || 'unknown'
    });

    res.json({ success: true } as HeartbeatResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('SINGLE_PLAYER', `Heartbeat error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' } as HeartbeatResponse);
  }
});

/**
 * DELETE /api/single-player/heartbeat
 * Remove a single player session (on game end/unmount)
 *
 * Body: { sessionId: string }
 */
router.delete('/heartbeat', (req: HeartbeatRequest, res: Response): void => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'sessionId is required' } as HeartbeatResponse);
      return;
    }

    activeSinglePlayers.delete(sessionId);
    res.json({ success: true } as HeartbeatResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('SINGLE_PLAYER', `Heartbeat delete error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' } as HeartbeatResponse);
  }
});

/**
 * GET /api/single-player/count
 * Get current active single player count (public endpoint for testing)
 */
router.get('/count', (_req: Request, res: Response): void => {
  res.json({
    count: getActiveSinglePlayerCount(),
    byLanguage: getSinglePlayersByLanguage(),
    byMode: getSinglePlayersByMode(),
    timestamp: Date.now()
  } as CountResponse);
});

// Export both router and utility functions
export default router;
export { getActiveSinglePlayerCount, getSinglePlayersByLanguage, getSinglePlayersByMode };

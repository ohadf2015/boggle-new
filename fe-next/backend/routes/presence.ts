/**
 * Page Presence Heartbeat API Routes (thin wrapper)
 *
 * All logic lives in ../modules/pagePresenceStore (pure, unit-tested). These
 * handlers just adapt HTTP <-> the store. Admin pages are skipped in the store.
 */

import express, { Request, Response, Router } from 'express';
import logger from '../utils/logger';
import {
  recordPagePresence,
  removePagePresence,
  pruneStale,
  getActivePagePresence,
} from '../modules/pagePresenceStore';

// Re-export so existing consumers (admin gameRoutes) keep importing from here.
export { getActivePagePresence } from '../modules/pagePresenceStore';

const router: Router = express.Router();

const CLEANUP_INTERVAL_MS = 30000;
setInterval((): void => {
  const cleaned = pruneStale();
  if (cleaned > 0) {
    logger.debug('PRESENCE', `Cleaned ${cleaned} stale page-presence sessions`);
  }
}, CLEANUP_INTERVAL_MS);

interface HeartbeatBody {
  sessionId?: string;
  path?: string;
  username?: string | null;
  playerId?: string | null;
  isAuthenticated?: boolean;
}

/**
 * POST /api/presence/heartbeat — upsert the caller's current page.
 */
router.post('/heartbeat', (req: Request, res: Response): void => {
  const body = (req.body || {}) as HeartbeatBody;
  if (!body.sessionId) {
    res.status(400).json({ success: false, error: 'sessionId required' });
    return;
  }
  recordPagePresence(body);
  res.json({ success: true });
});

/**
 * DELETE /api/presence/heartbeat — remove the caller's session on unload.
 */
router.delete('/heartbeat', (req: Request, res: Response): void => {
  const body = (req.body || {}) as HeartbeatBody;
  removePagePresence(body.sessionId);
  res.json({ success: true });
});

export default router;

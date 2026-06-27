/**
 * Connection Page Handler
 *
 * Records which route each connected client is currently viewing, so the admin
 * live monitor can break down the otherwise-opaque socket connection count by
 * page. The client emits `pageView` on connect and on every route change; we
 * stash the normalized path on socket.data.page (read back in the
 * /api/admin/live-games endpoint). No broadcast, no game lookup — purely a
 * per-socket annotation.
 */

import type { Server, Socket } from 'socket.io';

import { normalizePagePath } from '../../lib/presence/normalizePagePath';
import { checkRateLimit } from '../utils/rateLimiter.js';

interface PageViewPayload {
  path?: unknown;
}

/**
 * Register the pageView handler for a socket.
 * @param _io - Socket.IO server instance (unused; kept for handler signature parity)
 * @param socket - Socket.IO socket instance
 */
function registerConnectionPageHandler(_io: Server, socket: Socket): void {
  socket.on('pageView', (data: PageViewPayload) => {
    // Light rate limit — pageView is low-frequency (connect + route changes).
    if (!checkRateLimit(socket.id, 0.2)) return;

    const path = data && typeof data.path === 'string' ? data.path : null;
    socket.data.page = path ? normalizePagePath(path) : null;
  });
}

export { registerConnectionPageHandler };

/**
 * P6 live-E2E helper: socket-only backend on :3001.
 *
 * The dev server on :3100 predates today's wordcraft backend code, and the
 * client socket URL (`.env` NEXT_PUBLIC_WS_URL) points at :3001. This boots
 * ONLY the Express-socket half of server/index.ts via createSocketServer
 * (which initializes the handlers itself — a second initializeSocketHandlers
 * call here would double-register every handler), so the running :3100
 * frontend keeps its .next lock and today's backend handlers still get
 * exercised end-to-end.
 */
import '../server/loadEnv';
import http from 'http';
import { createSocketServer } from '../server/socketSetup';
import { initRedis } from '../backend/redis/connection';

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health/live') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'alive', socketOnly: true }));
    return;
  }
  res.writeHead(200);
  res.end('ok');
});

initRedis().then(() => {
  createSocketServer(httpServer, '*');
  httpServer.listen(3001, '0.0.0.0', () => {
    console.log('P6 socket-only backend listening on :3001');
  });
});

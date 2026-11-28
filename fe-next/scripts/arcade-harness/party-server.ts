import { createServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { Server } from 'socket.io';
import { registerArcadePartyHandlers } from '../../backend/handlers/arcadePartyHandler';
import { initRateLimit } from '../../backend/utils/rateLimiter';

const [site, port = '3047'] = process.argv.slice(2);
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png' };

const http = createServer(async (req, res) => {
  const raw = path.join(site, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  const p = raw.endsWith('/') ? path.join(raw, 'index.html') : raw;
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
const io = new Server(http);
io.on('connection', (socket) => {
  initRateLimit(socket);
  registerArcadePartyHandlers(io, socket);
});
http.listen(Number(port), '127.0.0.1', () => console.log(`party harness on http://127.0.0.1:${port}`));

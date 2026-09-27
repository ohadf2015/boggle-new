/**
 * Opponent word feed batcher.
 *
 * The opponent word feed is a cosmetic, ephemeral UI element (shows that a
 * rival found *some* word — length + first/last letter only, auto-removes in
 * ~3s). Previously every valid word fired its own `opponentWordFound` room
 * broadcast: with N players each submitting w words/sec that is w·N² recipient
 * sends per second. This batcher coalesces all words found within a short
 * window into a SINGLE `opponentWordsBatch` broadcast, collapsing volume to
 * ~(1/window)·N regardless of submission rate.
 *
 * Sent volatile: the feed is non-critical, so dropping a batch under transport
 * backpressure is harmless (mirrors the leaderboard broadcast). The client
 * filters out its own words, so the batch is broadcast to the whole room.
 */

import type { Server } from 'socket.io';
// Extensionless: this module is reachable from the Next/Turbopack app graph
// (via gameStateManager ← app/api routes), which resolves .ts directly.
import { volatileBroadcastToRoom, getGameRoom } from './socketHelpers';

export interface OpponentWordItem {
  playerId: string;
  playerName: string;
  wordLength: number;
  firstLetter: string;
  lastLetter: string;
  score: number;
}

const DEFAULT_WINDOW_MS = 150;
// ponytail: hard cap per flush bounds memory if a huge room floods one window;
// keep the newest words (most relevant to the live feed).
const MAX_BATCH = 60;

interface FeedBuffer {
  items: OpponentWordItem[];
  timer: ReturnType<typeof setTimeout> | null;
}

const buffers: Map<string, FeedBuffer> = new Map();

/**
 * Queue an opponent word for the next batched flush. Starts the window timer
 * on the first word; subsequent words within the window just accumulate.
 */
export function queueOpponentWord(
  io: Server,
  gameCode: string,
  item: OpponentWordItem,
  windowMs: number = DEFAULT_WINDOW_MS
): void {
  let buf = buffers.get(gameCode);
  if (!buf) {
    buf = { items: [], timer: null };
    buffers.set(gameCode, buf);
  }
  buf.items.push(item);
  if (buf.items.length > MAX_BATCH) {
    buf.items.shift(); // drop oldest, keep newest
  }
  if (!buf.timer) {
    buf.timer = setTimeout(() => flushOpponentWordFeed(io, gameCode), windowMs);
  }
}

/** Emit the accumulated batch (if any) and reset the window. */
export function flushOpponentWordFeed(io: Server, gameCode: string): void {
  const buf = buffers.get(gameCode);
  if (!buf) return;
  if (buf.timer) {
    clearTimeout(buf.timer);
    buf.timer = null;
  }
  if (buf.items.length === 0) return;
  const words = buf.items;
  buf.items = [];
  volatileBroadcastToRoom(io, getGameRoom(gameCode), 'opponentWordsBatch', { words });
}

/** Cancel any pending flush and drop the buffer. Call on game end / round reset. */
export function clearOpponentWordFeed(gameCode: string): void {
  const buf = buffers.get(gameCode);
  if (buf?.timer) clearTimeout(buf.timer);
  buffers.delete(gameCode);
}

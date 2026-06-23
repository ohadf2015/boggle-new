/**
 * playerFoundWord batcher.
 *
 * `playerFoundWord` drives the live word feed, combo FX, TV-broadcast activity,
 * and the pending-word chip confirm. Previously it fired one room broadcast per
 * valid word: with N players each submitting w words/sec that is w·N² recipient
 * sends per second. This batcher coalesces all word payloads found within a
 * short window into a SINGLE `playerFoundWordBatch` broadcast — an array of the
 * EXACT same per-word payloads — collapsing volume to ~(1/window)·N.
 *
 * Sent RELIABLY (not volatile): unlike the cosmetic opponent feed, this batch
 * carries the own-word pending-chip confirm (confirmPending has no other
 * trigger) and the host word-count/score tracking. After coalescing the rate is
 * only ~(1/window)·N, so there is no buffering pressure that volatile would
 * relieve — volatile would be pure packet-loss downside on flaky/mobile clients.
 *
 * ponytail: near-duplicate of opponentWordFeedBatcher (different event name,
 * payload type, and opponent stays volatile since it's purely cosmetic). Kept
 * separate to avoid touching the already-shipped opponent batcher; merge into
 * one generic windowed-batcher if a third caller appears.
 */

import type { Server } from 'socket.io';
import { broadcastToRoom, getGameRoom } from './socketHelpers';

export interface PlayerFoundWordItem {
  username: string;
  word: string;
  wordCount: number;
  score: number;
  serverSeq?: number; // omitted by bot emitters; no client reads it
  comboLevel: number;
  isFirstFinder: boolean;
  inputMethod?: string;
  comboSync?: { comboType: string; username: string };
}

const DEFAULT_WINDOW_MS = 150;
const MAX_BATCH = 60;

interface FeedBuffer {
  items: PlayerFoundWordItem[];
  timer: ReturnType<typeof setTimeout> | null;
}

const buffers: Map<string, FeedBuffer> = new Map();

export function queuePlayerFoundWord(
  io: Server,
  gameCode: string,
  item: PlayerFoundWordItem,
  windowMs: number = DEFAULT_WINDOW_MS
): void {
  let buf = buffers.get(gameCode);
  if (!buf) {
    buf = { items: [], timer: null };
    buffers.set(gameCode, buf);
  }
  buf.items.push(item);
  if (buf.items.length > MAX_BATCH) {
    buf.items.shift();
  }
  if (!buf.timer) {
    buf.timer = setTimeout(() => flushPlayerFoundWords(io, gameCode), windowMs);
  }
}

export function flushPlayerFoundWords(io: Server, gameCode: string): void {
  const buf = buffers.get(gameCode);
  if (!buf) return;
  if (buf.timer) {
    clearTimeout(buf.timer);
    buf.timer = null;
  }
  if (buf.items.length === 0) return;
  const words = buf.items;
  buf.items = [];
  broadcastToRoom(io, getGameRoom(gameCode), 'playerFoundWordBatch', { words });
}

export function clearPlayerFoundWords(gameCode: string): void {
  const buf = buffers.get(gameCode);
  if (buf?.timer) clearTimeout(buf.timer);
  buffers.delete(gameCode);
}

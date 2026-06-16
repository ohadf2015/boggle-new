'use client';
import type { ClearSubmission } from './anti-cheat';

/**
 * Offline replay queue for Wordfall (Blast V2) level clears.
 *
 * When an authed rider clears a level with no connection, the POST to
 * /api/blast/clear-level fails. Guests already persist their level position to
 * localStorage, but authed players would lose the coins/chest progress for that
 * clear. This queue stashes the full submission and replays it on reconnect.
 *
 * Replay is safe because every submission carries a client-generated
 * `submissionId` (crypto.randomUUID in BlastGame), and the server dedupes on it
 * — re-sending the same clear returns the existing result instead of
 * double-crediting.
 */

export interface QueuedClear {
  submission: ClearSubmission;
  earnedCoins: number;
  earnedGems: number;
  unlocksSeen?: Record<string, boolean>;
}

const KEY = 'blast-v2-clear-queue';
// Bound the queue so a long offline streak can't grow localStorage without
// limit. Oldest entries fall off first.
const MAX_QUEUE = 50;

function read(): QueuedClear[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedClear[]) : [];
  } catch {
    return [];
  }
}

function write(queue: QueuedClear[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // Quota / private-mode — drop silently; gameplay is unaffected.
  }
}

export function readClearQueue(): QueuedClear[] {
  return read();
}

export function clearClearQueue(): void {
  write([]);
}

/** Append a clear, trimming the oldest entries past the cap. */
export function enqueueClear(item: QueuedClear): void {
  const queue = read();
  queue.push(item);
  write(queue.length > MAX_QUEUE ? queue.slice(queue.length - MAX_QUEUE) : queue);
}

/**
 * Replay queued clears. Returns how many were accepted/dropped (i.e. removed
 * from the queue). Stops at the first transient failure (network error or 5xx)
 * and retains that item plus everything after it for the next attempt. A 4xx is
 * treated as a permanent rejection and dropped so it can't wedge the queue.
 */
export async function flushClearQueue(fetchFn: typeof fetch = fetch): Promise<number> {
  const queue = read();
  if (queue.length === 0) return 0;

  let i = 0;
  let flushed = 0;
  for (; i < queue.length; i++) {
    const item = queue[i]!;
    try {
      const res = await fetchFn('/api/blast/clear-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item.submission,
          earnedCoins: item.earnedCoins,
          earnedGems: item.earnedGems,
          unlocksSeen: item.unlocksSeen,
        }),
      });
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // Accepted (idempotent) or permanently rejected — either way, done.
        flushed++;
        continue;
      }
      // Transient server error (5xx) — stop and keep this item for next time.
      break;
    } catch {
      // Still offline — keep this item and the rest.
      break;
    }
  }
  write(queue.slice(i));
  return flushed;
}

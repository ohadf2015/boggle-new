/**
 * Offline completion queue — localStorage-backed FIFO queue for
 * adventure level completions that fail to sync to the server.
 *
 * Entries are replayed when connectivity returns (via ProgressionContext).
 * Max 50 entries to prevent storage bloat.
 */

const STORAGE_KEY = 'adventure_offline_completions';
const MAX_QUEUE_SIZE = 50;

export interface QueuedCompletion {
  world: number;
  level: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
  words: number;
  goldEarned?: number;
  longWords?: number;
  wordsFound?: string[];
  flashChallengeGold?: number;
  timePlayed?: number;
  queuedAt: number;
}

function readQueue(): QueuedCompletion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedCompletion[]): void {
  if (queue.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
}

export function enqueueCompletion(completion: QueuedCompletion): void {
  const queue = readQueue();
  queue.push(completion);
  // Cap at MAX_QUEUE_SIZE — drop oldest if overflow
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }
  writeQueue(queue);
}

export function dequeueCompletion(): QueuedCompletion | null {
  const queue = readQueue();
  if (queue.length === 0) return null;
  const first = queue.shift()!;
  writeQueue(queue);
  return first;
}

export function peekQueue(): QueuedCompletion[] {
  return readQueue();
}

export function queueSize(): number {
  return readQueue().length;
}

export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

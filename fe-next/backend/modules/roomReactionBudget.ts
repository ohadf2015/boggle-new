import { gameCleanupEmitter } from '../events/gameCleanup';

/** A full class reacting to one claim would fan out ~100 emits/s to 49 phones each; the claim toast only shows five. */
export const ROOM_REACTIONS_PER_SECOND = 8;

const WINDOW_MS = 1000;
const PRUNE_AT = 256;
const windows = new Map<string, { start: number; count: number }>();

export function takeRoomReaction(gameCode: string, now: number = Date.now()): boolean {
  if (windows.size > PRUNE_AT) {
    for (const [code, w] of windows) if (now - w.start >= WINDOW_MS) windows.delete(code);
  }
  const current = windows.get(gameCode);
  if (!current || now - current.start >= WINDOW_MS) {
    windows.set(gameCode, { start: now, count: 1 });
    return true;
  }
  if (current.count >= ROOM_REACTIONS_PER_SECOND) return false;
  current.count += 1;
  return true;
}

gameCleanupEmitter.onGameDeleted(({ gameCode }) => {
  windows.delete(gameCode);
});

// ==========================================
// Type Definitions
// ==========================================

interface GlobalCounters {
  wordAccepted: number;
  wordNotOnBoard: number;
  wordNeedsValidation: number;
  rateLimited: number;
  eventLoopLagMs: number;
  'scorecard.generated': number;
  'scorecard.error': number;
}

interface RoomMetrics {
  wordAccepted: number;
  wordNotOnBoard: number;
  wordNeedsValidation: number;
  rateLimited: number;
  [key: string]: number;
}

interface RoomMetricsEntry {
  gameCode: string;
  wordAccepted: number;
  wordNotOnBoard: number;
  wordNeedsValidation: number;
  rateLimited: number;
  [key: string]: string | number;
}

type MetricName = keyof GlobalCounters;

// ==========================================
// State
// ==========================================

const counters: GlobalCounters = {
  wordAccepted: 0,
  wordNotOnBoard: 0,
  wordNeedsValidation: 0,
  rateLimited: 0,
  eventLoopLagMs: 0,
  'scorecard.generated': 0,
  'scorecard.error': 0
};

const perRoom = new Map<string, RoomMetrics>();

// ==========================================
// Functions
// ==========================================

/**
 * Increment a global counter
 */
export function inc(name: MetricName, by: number = 1): void {
  if (counters[name] === undefined) return;
  counters[name] += by;
}

/**
 * Increment a per-game counter
 */
export function incPerGame(gameCode: string | null | undefined, name: string, by: number = 1): void {
  if (!gameCode) return;
  const current: RoomMetrics = perRoom.get(gameCode) || {
    wordAccepted: 0,
    wordNotOnBoard: 0,
    wordNeedsValidation: 0,
    rateLimited: 0
  };
  if (current[name] === undefined) current[name] = 0;
  current[name] += by;
  perRoom.set(gameCode, current);
}

/**
 * Get global metrics
 */
export function getMetrics(): GlobalCounters {
  return { ...counters };
}

/**
 * Get per-room metrics
 */
export function getRoomMetrics(): RoomMetricsEntry[] {
  const out: RoomMetricsEntry[] = [];
  for (const [gameCode, m] of perRoom.entries()) {
    out.push({ gameCode, ...m });
  }
  return out;
}

/**
 * Drop a single game's per-room counters.
 * Called from gameStateManager.deleteGame so per-game entries do not accumulate
 * unbounded for the process lifetime (every game ever created would otherwise
 * leak a Map entry → slow heap growth → OOM).
 */
export function deleteRoom(gameCode: string | null | undefined): void {
  if (!gameCode) return;
  perRoom.delete(gameCode);
}

/**
 * Reset all metrics
 */
export function resetAll(): void {
  counters.wordAccepted = 0;
  counters.wordNotOnBoard = 0;
  counters.wordNeedsValidation = 0;
  counters.rateLimited = 0;
  counters.eventLoopLagMs = 0;
  perRoom.clear();
}

/**
 * Set event loop lag metric
 */
export function setEventLoopLag(ms: number): void {
  counters.eventLoopLagMs = ms;
}

/**
 * Ensure a game has metrics initialized
 */
export function ensureGame(gameCode: string | null | undefined): void {
  if (!gameCode) return;
  if (!perRoom.has(gameCode)) {
    perRoom.set(gameCode, {
      wordAccepted: 0,
      wordNotOnBoard: 0,
      wordNeedsValidation: 0,
      rateLimited: 0
    });
  }
}

export type { GlobalCounters, RoomMetrics, RoomMetricsEntry, MetricName };

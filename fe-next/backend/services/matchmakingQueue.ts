/**
 * Matchmaking Queue Service
 * In-memory ELO-based matchmaking with range expansion over time.
 * Redis-backed version can replace the Map with sorted sets later.
 */

const INITIAL_RANGE = 100;
const RANGE_EXPANSION_STEP = 50;
const RANGE_EXPANSION_INTERVAL_MS = 5000;
const MAX_RANGE = 500;
const TIMEOUT_MS = 60000;

export type GameMode = 'classic' | 'wordHunt';

export interface QueueEntry {
  socketId: string;
  playerId: string;
  elo: number;
  gameMode: GameMode;
  language: string;
  joinedAt: number;
}

export interface MatchResult {
  player1: QueueEntry;
  player2: QueueEntry;
  roomId: string;
}

export interface QueueStats {
  playersInQueue: number;
  avgWaitTime: number;
  activeMatches: number;
}

export class MatchmakingQueue {
  private entries: Map<string, QueueEntry> = new Map(); // socketId -> entry
  private playerToSocket: Map<string, string> = new Map(); // playerId -> socketId
  private matchCount = 0;

  joinQueue(
    socketId: string,
    playerId: string,
    elo: number,
    gameMode: GameMode,
    language: string
  ): void {
    // Prevent duplicate player entries
    const existingSocket = this.playerToSocket.get(playerId);
    if (existingSocket) {
      this.entries.delete(existingSocket);
    }

    const entry: QueueEntry = {
      socketId,
      playerId,
      elo,
      gameMode,
      language,
      joinedAt: Date.now(),
    };

    this.entries.set(socketId, entry);
    this.playerToSocket.set(playerId, socketId);
  }

  leaveQueue(socketId: string): void {
    const entry = this.entries.get(socketId);
    if (entry) {
      this.playerToSocket.delete(entry.playerId);
      this.entries.delete(socketId);
    }
  }

  tryMatch(socketId: string): MatchResult | null {
    const seeker = this.entries.get(socketId);
    if (!seeker) return null;

    const seekerRange = this.calculateRange(seeker);

    for (const [candidateSocket, candidate] of this.entries) {
      if (candidateSocket === socketId) continue;
      if (candidate.gameMode !== seeker.gameMode) continue;
      if (candidate.language !== seeker.language) continue;

      const eloDiff = Math.abs(seeker.elo - candidate.elo);
      const candidateRange = this.calculateRange(candidate);
      const effectiveRange = Math.max(seekerRange, candidateRange);

      if (eloDiff <= effectiveRange) {
        // Match found — remove both
        this.removeEntry(socketId);
        this.removeEntry(candidateSocket);
        this.matchCount++;

        return {
          player1: seeker,
          player2: candidate,
          roomId: `ranked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
      }
    }

    return null;
  }

  getTimedOutEntries(): QueueEntry[] {
    const now = Date.now();
    const timedOut: QueueEntry[] = [];
    for (const entry of this.entries.values()) {
      if (now - entry.joinedAt >= TIMEOUT_MS) {
        timedOut.push(entry);
      }
    }
    return timedOut;
  }

  getQueueStats(): QueueStats {
    const now = Date.now();
    let totalWait = 0;
    for (const entry of this.entries.values()) {
      totalWait += now - entry.joinedAt;
    }
    return {
      playersInQueue: this.entries.size,
      avgWaitTime: this.entries.size > 0 ? totalWait / this.entries.size : 0,
      activeMatches: this.matchCount,
    };
  }

  getEntryEloRange(socketId: string): number {
    const entry = this.entries.get(socketId);
    if (!entry) return INITIAL_RANGE;
    return this.calculateRange(entry);
  }

  /** Test helper: override join time for time-dependent tests */
  setEntryJoinTime(socketId: string, time: number): void {
    const entry = this.entries.get(socketId);
    if (entry) {
      entry.joinedAt = time;
    }
  }

  destroy(): void {
    this.entries.clear();
    this.playerToSocket.clear();
    this.matchCount = 0;
  }

  private calculateRange(entry: QueueEntry): number {
    const elapsed = Date.now() - entry.joinedAt;
    const expansions = Math.floor(elapsed / RANGE_EXPANSION_INTERVAL_MS);
    return Math.min(INITIAL_RANGE + expansions * RANGE_EXPANSION_STEP, MAX_RANGE);
  }

  private removeEntry(socketId: string): void {
    const entry = this.entries.get(socketId);
    if (entry) {
      this.playerToSocket.delete(entry.playerId);
      this.entries.delete(socketId);
    }
  }
}

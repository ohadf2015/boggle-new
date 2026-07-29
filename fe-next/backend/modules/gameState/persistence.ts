/**
 * Game State Persistence
 * Redis persistence operations for game state
 */

import type { GameState, GameUser, RedisClient, Spectator } from './types';

import logger from '../../utils/logger';
import * as redisClientModule from '../../redisClient';

/**
 * Shape of a game state as read from Redis.
 * Extends GameState but overrides Map/Set fields (serialized as arrays)
 * and adds legacy `usersV2` envelope.
 */
type PersistedGameState = Omit<GameState, 'letterPositions' | 'selectedVocabulary' | 'lessonVocabulary' | 'kickedPlayers'> & {
  letterPositions?: [string, [number, number][]][];
  selectedVocabulary?: string[];
  lessonVocabulary?: string[];
  kickedPlayers?: string[];
  usersV2?: Record<string, GameUser>;
};

function getRedisClient(): RedisClient {
  return redisClientModule as unknown as RedisClient;
}

// Debounce timers for persistence
const persistTimers: Record<string, ReturnType<typeof setTimeout>> = {};
// Cleanup timers for restored games (cancellable on shutdown)
const restoreCleanupTimers: ReturnType<typeof setTimeout>[] = [];
// Debounce bumped 200→1000ms: coalesces more writes under concurrent-game load.
// Each word submission + score/leaderboard update triggers a persist call; at 200ms
// bursts of 5-10 events barely coalesced. Durability window grows to 1s on crash,
// but Redis-primary mode makes in-memory state the source of truth intra-session.
const PERSIST_DEBOUNCE_MS = parseInt(process.env.PERSIST_DEBOUNCE_MS || '1000', 10);

export function persistGameState(
  gameCode: string,
  games: Record<string, GameState>
): void {
  if (persistTimers[gameCode]) clearTimeout(persistTimers[gameCode]);

  persistTimers[gameCode] = setTimeout(async () => {
    const game = games[gameCode];
    if (!game) {
      delete persistTimers[gameCode];
      return;
    }

    try {
      await getRedisClient().saveGameState(gameCode, game);
      logger.debug('PERSIST', `Game ${gameCode} persisted to Redis`);
    } catch (error) {
      logger.error('PERSIST', `Failed to persist game ${gameCode}`, error);
    }
    delete persistTimers[gameCode];
  }, PERSIST_DEBOUNCE_MS);
}

export async function persistGameStateNow(
  gameCode: string,
  games: Record<string, GameState>
): Promise<void> {
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
    delete persistTimers[gameCode];
  }

  const game = games[gameCode];
  if (!game) return;

  try {
    await getRedisClient().saveGameState(gameCode, game);
    logger.debug('PERSIST', `Game ${gameCode} immediately persisted to Redis`);
  } catch (error) {
    logger.error('PERSIST', `Failed to persist game ${gameCode}`, error);
  }
}

export async function restoreGameFromRedis(
  gameCode: string,
  games: Record<string, GameState>
): Promise<GameState | null> {
  try {
    const rawState = await getRedisClient().getGameState(gameCode);
    if (!rawState) return null;
    const persisted = rawState as unknown as PersistedGameState;

    logger.info('PERSIST', `Restoring game ${gameCode} from Redis`);

    // Prefer v2 full user objects; fall back to empty if only v1 username list
    const usersV2 = persisted.usersV2;
    const restoredUsers: Record<string, GameUser> = (usersV2 && typeof usersV2 === 'object' && !Array.isArray(usersV2))
      ? usersV2
      : {};

    // Null out socket IDs — they're stale after crash
    for (const user of Object.values(restoredUsers)) {
      if (user && typeof user === 'object') {
        user.socketId = null as unknown as string;
      }
    }

    const rawSpectators = persisted.spectators;
    const restoredSpectators: Record<string, Spectator> = (rawSpectators && typeof rawSpectators === 'object' && !Array.isArray(rawSpectators))
      ? rawSpectators
      : {};

    const restored: GameState = {
      gameCode,
      hostSocketId: null,
      hostUsername: persisted.hostUsername || null,
      hostPlayerId: persisted.hostPlayerId || undefined,
      roomName: persisted.roomName,
      language: persisted.language || 'en',
      users: restoredUsers,
      spectators: restoredSpectators,
      playerScores: persisted.playerScores || {},
      playerEventBonuses: persisted.playerEventBonuses || {},
      playerWords: persisted.playerWords || {},
      playerAchievements: persisted.playerAchievements || {},
      playerCombos: persisted.playerCombos || {},
      gameState: persisted.gameState || 'waiting',
      letterGrid: persisted.letterGrid,
      timerSeconds: persisted.timerSeconds || 180,
      remainingTime: persisted.remainingTime ?? undefined,
      gameDuration: persisted.gameDuration ?? undefined,
      minWordLength: persisted.minWordLength ?? undefined,
      difficulty: persisted.difficulty || undefined,
      gameStartedAt: persisted.gameStartedAt ?? undefined,
      tournamentId: persisted.tournamentId,
      reconnectionTimeout: null,
      isRanked: persisted.isRanked ?? false,
      isPrivate: persisted.isPrivate ?? false,
      isClassroom: persisted.isClassroom ?? false,
      allowLateJoin: persisted.allowLateJoin ?? true,
      aiApprovedWords: persisted.aiApprovedWords || [],
      peerValidationWord: null,
      peerValidationVotes: persisted.peerValidationVotes || {},
      createdAt: persisted.createdAt || Date.now(),
      lastActivity: persisted.lastActivity || Date.now(),
      restoredFromRedis: true,
      gameSessionId: 0,
      playersReadyForNextGame: {},
      gameMode: persisted.gameMode || 'classic',
      blastModeState: persisted.blastModeState || null,
      wordHuntState: persisted.wordHuntState || null,
      chatHistory: persisted.chatHistory || undefined,
      cachedResultsPayload: persisted.cachedResultsPayload || undefined,
    };
    games[gameCode] = restored;

    // Reconstruct Map from serialized entries
    const lpEntries = persisted.letterPositions;
    if (Array.isArray(lpEntries) && lpEntries.length > 0) {
      restored.letterPositions = new Map(lpEntries);
    }

    // Reconstruct Sets from serialized arrays
    const selVocab = persisted.selectedVocabulary;
    if (Array.isArray(selVocab) && selVocab.length > 0) {
      restored.selectedVocabulary = new Set(selVocab);
    }
    const lesVocab = persisted.lessonVocabulary;
    if (Array.isArray(lesVocab) && lesVocab.length > 0) {
      restored.lessonVocabulary = new Set(lesVocab);
    }
    const kicked = persisted.kickedPlayers;
    if (Array.isArray(kicked) && kicked.length > 0) {
      restored.kickedPlayers = new Set(kicked);
    }

    // Reconstruct O(1) lookup Sets from restored word arrays
    restored.playerWordsSet = {};
    for (const [u, words] of Object.entries(restored.playerWords)) {
      restored.playerWordsSet[u] = new Set(words as string[]);
    }

    return games[gameCode];
  } catch (error) {
    logger.error('PERSIST', `Failed to restore game ${gameCode} from Redis`, error);
    return null;
  }
}

export async function getAllGameCodesFromRedis(): Promise<string[]> {
  try {
    const redis = getRedisClient();
    if (redis.getAllGameCodes) return await redis.getAllGameCodes();
    if (redis.getAllGameKeys) return await redis.getAllGameKeys();
    return [];
  } catch (error) {
    logger.error('PERSIST', 'Failed to get game codes from Redis', error);
    return [];
  }
}

export async function deleteGameFromRedis(gameCode: string): Promise<void> {
  try {
    await getRedisClient().deleteGameState?.(gameCode);
  } catch (error) {
    logger.error('PERSIST', `Failed to delete game ${gameCode} from Redis`, error);
  }
}

/**
 * Restore all active games from Redis on server startup.
 * Games that were persisted during graceful shutdown are loaded back into memory
 * so reconnecting players find their game state intact.
 * Games with no players reconnecting within RESTORE_CLEANUP_MS are cleaned up.
 */
const RESTORE_CLEANUP_MS = 2 * 60 * 1000; // 2 minutes

export async function restoreAllGamesFromRedis(
  games: Record<string, GameState>
): Promise<number> {
  try {
    const gameCodes = await getAllGameCodesFromRedis();
    if (gameCodes.length === 0) return 0;

    logger.info('PERSIST', `Found ${gameCodes.length} games in Redis, restoring...`);

    let restored = 0;
    for (const gameCode of gameCodes) {
      try {
        const game = await restoreGameFromRedis(gameCode, games);
        if (game) {
          restored++;
          // Set a cleanup timer — if no players reconnect, clean up the game
          const timer = setTimeout(() => {
            const g = games[gameCode];
            if (g && Object.keys(g.users).length === 0) {
              logger.info('PERSIST', `No players reconnected to ${gameCode} within ${RESTORE_CLEANUP_MS / 1000}s, cleaning up`);
              delete games[gameCode];
            }
          }, RESTORE_CLEANUP_MS);
          restoreCleanupTimers.push(timer);
        }
      } catch (error) {
        logger.error('PERSIST', `Failed to restore game ${gameCode}`, error);
      }
    }

    logger.info('PERSIST', `Restored ${restored}/${gameCodes.length} games from Redis`);
    return restored;
  } catch (error) {
    logger.error('PERSIST', 'Failed to restore games from Redis', error);
    return 0;
  }
}

export function clearPersistTimer(gameCode: string): void {
  if (persistTimers[gameCode]) {
    clearTimeout(persistTimers[gameCode]);
    delete persistTimers[gameCode];
  }
}

/** Cancel all restore cleanup timers (call on graceful shutdown). */
export function clearAllRestoreTimers(): void {
  for (const t of restoreCleanupTimers) clearTimeout(t);
  restoreCleanupTimers.length = 0;
}

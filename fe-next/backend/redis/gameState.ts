// gameState.ts - Game state Redis operations

import { circuitBreaker } from './circuitBreaker';
import {
  getTTLWithJitter,
  MAX_RETRY_ATTEMPTS,
  MAX_SCAN_ITERATIONS,
  SCAN_COUNT,
  TTL_CONFIG,
} from './config';
import { getRedisClient, isRedisAvailable } from './connection';
import { KEY_PATTERNS, KEYS } from './keys';
import type { GameDataInput, GameStateData } from './types';

import logger from '../utils/logger';

/** Safely parse JSON with a fallback — prevents a single corrupted field from crashing the entire game state */
function safeJsonParse<T>(value: string | undefined, fallback: T, fieldName: string, gameCode?: string): T {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch (err) {
    logger.warn('REDIS', `Corrupted JSON in field "${fieldName}" for game ${gameCode || 'unknown'}, using fallback`);
    return fallback;
  }
}

export async function saveGameState(gameCode: string, gameData: GameDataInput): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  const key = KEYS.game(gameCode);
  const client = getRedisClient()!;

  // Sanitize data - exclude WebSocket objects
  const sanitizedData: Record<string, string> = {
    roomName: gameData.roomName || '',
    users: JSON.stringify(Object.keys(gameData.users || {})),
    playerScores: JSON.stringify(gameData.playerScores || {}),
    playerWords: JSON.stringify(gameData.playerWords || {}),
    playerAchievements: JSON.stringify(gameData.playerAchievements || {}),
    playerWordDetails: JSON.stringify(gameData.playerWordDetails || {}),
    firstWordFound: JSON.stringify(gameData.firstWordFound || {}),
    gameState: gameData.gameState || 'waiting',
    startTime: gameData.startTime || '',
    endTime: gameData.endTime || '',
    letterGrid: JSON.stringify(gameData.letterGrid || []),
    timerSeconds: String(gameData.timerSeconds || 60),
    language: gameData.language || 'en',
    tournamentId: gameData.tournamentId || '',
  };

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await circuitBreaker.execute(async () => {
        const pipeline = client.pipeline();

        for (const [field, value] of Object.entries(sanitizedData)) {
          pipeline.hset(key, field, value);
        }

        pipeline.expire(key, getTTLWithJitter(TTL_CONFIG.GAME_STATE));
        await pipeline.exec();
      });
      return;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('REDIS', `Error saving game state (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${err.message}`);
      if (attempt === MAX_RETRY_ATTEMPTS) {
        logger.error('REDIS', 'Failed to save game state after all retry attempts');
      } else {
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

export async function getGameState(gameCode: string): Promise<GameStateData | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const key = KEYS.game(gameCode);
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() => client.hgetall(key));

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      roomName: data.roomName,
      users: safeJsonParse<string[]>(data.users, [], 'users', gameCode),
      playerScores: safeJsonParse<Record<string, number>>(data.playerScores, {}, 'playerScores', gameCode),
      playerWords: safeJsonParse<Record<string, string[]>>(data.playerWords, {}, 'playerWords', gameCode),
      playerAchievements: safeJsonParse<Record<string, string[]>>(data.playerAchievements, {}, 'playerAchievements', gameCode),
      playerWordDetails: safeJsonParse<Record<string, unknown[]>>(data.playerWordDetails, {}, 'playerWordDetails', gameCode),
      firstWordFound: safeJsonParse<Record<string, boolean>>(data.firstWordFound, {}, 'firstWordFound', gameCode),
      gameState: data.gameState,
      startTime: data.startTime,
      endTime: data.endTime,
      letterGrid: safeJsonParse<string[][]>(data.letterGrid, [], 'letterGrid', gameCode),
      timerSeconds: parseInt(data.timerSeconds) || 60,
      language: data.language,
      tournamentId: data.tournamentId || null,
    };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting game state: ${err.message}`);
    return null;
  }
}

export async function deleteGameState(gameCode: string): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const key = KEYS.game(gameCode);
    const client = getRedisClient()!;
    await circuitBreaker.execute(() => client.del(key));
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error deleting game state: ${err.message}`);
  }
}

export async function getAllGameCodes(): Promise<string[]> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return [];
  }

  try {
    const gameCodes: string[] = [];
    let cursor = '0';
    let iterations = 0;
    const client = getRedisClient()!;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations, returning partial results');
        break;
      }

      try {
        const result = await circuitBreaker.execute(() =>
          client.scan(cursor, 'MATCH', KEY_PATTERNS.games, 'COUNT', SCAN_COUNT)
        );
        cursor = result[0];
        const keys = result[1];

        keys.forEach((key: string) => {
          const parts = key.split(':');
          if (parts.length >= 4) {
            gameCodes.push(parts[parts.length - 1]);
          }
        });
      } catch (scanError: unknown) {
        const err = scanError as Error;
        logger.error('REDIS', `SCAN iteration failed at cursor ${cursor}: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (cursor !== '0');

    return gameCodes;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting game codes: ${err.message}`);
    return [];
  }
}

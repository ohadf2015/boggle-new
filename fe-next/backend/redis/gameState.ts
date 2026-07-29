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

/**
 * Strip socket-related refs from user/spectator objects before Redis persistence.
 * Socket IDs are process-local and meaningless after crash/restore.
 */
function stripSocketRefs(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      const { socketId, socket, ...rest } = value as Record<string, unknown>;
      cleaned[key] = rest;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

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

  // Sanitize data — serialize all fields, converting non-serializable types.
  // Users stored as full objects (v2) for complete crash recovery.
  const sanitizedData: Record<string, string> = {
    roomName: gameData.roomName || '',
    // v2: store full user objects (strip socket refs). v1 compat: 'users' key kept as username list.
    users: JSON.stringify(Object.keys(gameData.users || {})),
    usersV2: JSON.stringify(stripSocketRefs(gameData.users || {})),
    spectators: JSON.stringify(stripSocketRefs(gameData.spectators || {})),
    playerScores: JSON.stringify(gameData.playerScores || {}),
    playerEventBonuses: JSON.stringify(gameData.playerEventBonuses || {}),
    playerWords: JSON.stringify(gameData.playerWords || {}),
    playerAchievements: JSON.stringify(gameData.playerAchievements || {}),
    playerWordDetails: JSON.stringify(gameData.playerWordDetails || {}),
    playerCombos: JSON.stringify(gameData.playerCombos || {}),
    firstWordFound: JSON.stringify(gameData.firstWordFound || {}),
    gameState: gameData.gameState || 'waiting',
    startTime: gameData.startTime || '',
    endTime: gameData.endTime || '',
    letterGrid: JSON.stringify(gameData.letterGrid || []),
    timerSeconds: String(gameData.timerSeconds || 60),
    remainingTime: String(gameData.remainingTime ?? ''),
    language: gameData.language || 'en',
    tournamentId: gameData.tournamentId || '',
    gameMode: gameData.gameMode || '',
    blastModeState: JSON.stringify(gameData.blastModeState || null),
    wordHuntState: JSON.stringify(gameData.wordHuntState || null),
    isRanked: String(gameData.isRanked ?? false),
    isPrivate: String(gameData.isPrivate ?? false),
    allowLateJoin: String(gameData.allowLateJoin ?? true),
    chatHistory: JSON.stringify(gameData.chatHistory || []),
    aiApprovedWords: JSON.stringify(gameData.aiApprovedWords || []),
    peerValidationVotes: JSON.stringify(gameData.peerValidationVotes || {}),
    cachedResultsPayload: JSON.stringify(gameData.cachedResultsPayload || null),
    // Serialize Map → Array<[key, value]> for letterPositions
    letterPositions: JSON.stringify(
      gameData.letterPositions instanceof Map ? Array.from(gameData.letterPositions.entries()) : []
    ),
    // Serialize Set → string[] for vocabulary/kicked
    selectedVocabulary: JSON.stringify(
      gameData.selectedVocabulary instanceof Set ? Array.from(gameData.selectedVocabulary) : []
    ),
    lessonVocabulary: JSON.stringify(
      gameData.lessonVocabulary instanceof Set ? Array.from(gameData.lessonVocabulary) : []
    ),
    kickedPlayers: JSON.stringify(
      gameData.kickedPlayers instanceof Set ? Array.from(gameData.kickedPlayers) : []
    ),
    createdAt: String(gameData.createdAt || ''),
    lastActivity: String(gameData.lastActivity || ''),
    gameDuration: String(gameData.gameDuration ?? ''),
    minWordLength: String(gameData.minWordLength ?? ''),
    difficulty: gameData.difficulty || '',
    gameStartedAt: String(gameData.gameStartedAt ?? ''),
    hostUsername: gameData.hostUsername || '',
    hostPlayerId: gameData.hostPlayerId || '',
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
      usersV2: data.usersV2 ? safeJsonParse<Record<string, unknown>>(data.usersV2, {}, 'usersV2', gameCode) : undefined,
      spectators: data.spectators ? safeJsonParse<Record<string, unknown>>(data.spectators, {}, 'spectators', gameCode) : undefined,
      playerScores: safeJsonParse<Record<string, number>>(data.playerScores, {}, 'playerScores', gameCode),
      playerEventBonuses: data.playerEventBonuses ? safeJsonParse<Record<string, number>>(data.playerEventBonuses, {}, 'playerEventBonuses', gameCode) : undefined,
      playerWords: safeJsonParse<Record<string, string[]>>(data.playerWords, {}, 'playerWords', gameCode),
      playerAchievements: safeJsonParse<Record<string, string[]>>(data.playerAchievements, {}, 'playerAchievements', gameCode),
      playerWordDetails: safeJsonParse<Record<string, unknown[]>>(data.playerWordDetails, {}, 'playerWordDetails', gameCode),
      playerCombos: data.playerCombos ? safeJsonParse<Record<string, number>>(data.playerCombos, {}, 'playerCombos', gameCode) : undefined,
      firstWordFound: safeJsonParse<Record<string, boolean>>(data.firstWordFound, {}, 'firstWordFound', gameCode),
      gameState: data.gameState,
      startTime: data.startTime,
      endTime: data.endTime,
      letterGrid: safeJsonParse<string[][]>(data.letterGrid, [], 'letterGrid', gameCode),
      timerSeconds: parseInt(data.timerSeconds, 10) || 60,
      remainingTime: data.remainingTime ? parseInt(data.remainingTime, 10) : null,
      language: data.language,
      tournamentId: data.tournamentId || null,
      gameMode: data.gameMode || null,
      blastModeState: safeJsonParse<Record<string, unknown> | null>(data.blastModeState, null, 'blastModeState', gameCode),
      wordHuntState: safeJsonParse<Record<string, unknown> | null>(data.wordHuntState, null, 'wordHuntState', gameCode),
      isRanked: data.isRanked === 'true',
      isPrivate: data.isPrivate === 'true',
      allowLateJoin: data.allowLateJoin !== 'false',
      chatHistory: data.chatHistory ? safeJsonParse<unknown[]>(data.chatHistory, [], 'chatHistory', gameCode) : undefined,
      aiApprovedWords: data.aiApprovedWords ? safeJsonParse<unknown[]>(data.aiApprovedWords, [], 'aiApprovedWords', gameCode) : undefined,
      peerValidationVotes: data.peerValidationVotes ? safeJsonParse<Record<string, string>>(data.peerValidationVotes, {}, 'peerValidationVotes', gameCode) : undefined,
      cachedResultsPayload: data.cachedResultsPayload ? safeJsonParse<Record<string, unknown> | null>(data.cachedResultsPayload, null, 'cachedResultsPayload', gameCode) : undefined,
      letterPositions: data.letterPositions ? safeJsonParse<Array<[string, [number, number][]]>>(data.letterPositions, [], 'letterPositions', gameCode) : undefined,
      selectedVocabulary: data.selectedVocabulary ? safeJsonParse<string[]>(data.selectedVocabulary, [], 'selectedVocabulary', gameCode) : undefined,
      lessonVocabulary: data.lessonVocabulary ? safeJsonParse<string[]>(data.lessonVocabulary, [], 'lessonVocabulary', gameCode) : undefined,
      kickedPlayers: data.kickedPlayers ? safeJsonParse<string[]>(data.kickedPlayers, [], 'kickedPlayers', gameCode) : undefined,
      createdAt: data.createdAt ? parseInt(data.createdAt) : undefined,
      lastActivity: data.lastActivity ? parseInt(data.lastActivity) : undefined,
      gameDuration: data.gameDuration ? parseInt(data.gameDuration) : undefined,
      minWordLength: data.minWordLength ? parseInt(data.minWordLength) : undefined,
      difficulty: data.difficulty || undefined,
      gameStartedAt: data.gameStartedAt ? parseInt(data.gameStartedAt) : undefined,
      hostUsername: data.hostUsername || null,
      hostPlayerId: data.hostPlayerId || undefined,
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

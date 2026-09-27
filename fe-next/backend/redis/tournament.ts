// tournament.ts - Tournament state Redis operations

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
import type { TournamentDataInput, TournamentStateData } from './types';

import logger from '../utils/logger';

export async function saveTournamentState(
  tournamentId: string,
  tournamentData: TournamentDataInput
): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  const key = KEYS.tournament(tournamentId);
  const client = getRedisClient()!;

  const sanitizedData: Record<string, string> = {
    id: tournamentData.id || '',
    hostPlayerId: tournamentData.hostPlayerId || '',
    hostUsername: tournamentData.hostUsername || '',
    name: tournamentData.name || '',
    totalRounds: String(tournamentData.totalRounds || 0),
    currentRound: String(tournamentData.currentRound || 0),
    status: tournamentData.status || '',
    settings: JSON.stringify(tournamentData.settings || {}),
    players: JSON.stringify(tournamentData.players || []),
    rounds: JSON.stringify(tournamentData.rounds || []),
    finalStandings: JSON.stringify(tournamentData.finalStandings || []),
    createdAt: tournamentData.createdAt || '',
  };

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await circuitBreaker.execute(async () => {
        const pipeline = client.pipeline();

        for (const [field, value] of Object.entries(sanitizedData)) {
          pipeline.hset(key, field, value);
        }

        pipeline.expire(key, getTTLWithJitter(TTL_CONFIG.TOURNAMENT));
        await pipeline.exec();
      });
      return;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(
        'REDIS',
        `Error saving tournament state (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${err.message}`
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

export async function getTournamentState(tournamentId: string): Promise<TournamentStateData | null> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return null;
  }

  try {
    const key = KEYS.tournament(tournamentId);
    const client = getRedisClient()!;
    const data = await circuitBreaker.execute(() => client.hgetall(key));

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      id: data.id,
      hostPlayerId: data.hostPlayerId,
      hostUsername: data.hostUsername,
      name: data.name,
      totalRounds: parseInt(data.totalRounds) || 0,
      currentRound: parseInt(data.currentRound) || 0,
      status: data.status,
      settings: JSON.parse(data.settings || '{}'),
      players: JSON.parse(data.players || '[]'),
      rounds: JSON.parse(data.rounds || '[]'),
      finalStandings: JSON.parse(data.finalStandings || '[]'),
      createdAt: data.createdAt,
    };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting tournament state: ${err.message}`);
    return null;
  }
}

export async function deleteTournamentState(tournamentId: string): Promise<void> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return;
  }

  try {
    const key = KEYS.tournament(tournamentId);
    const client = getRedisClient()!;
    await circuitBreaker.execute(() => client.del(key));
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error deleting tournament state: ${err.message}`);
  }
}

export async function getAllTournamentIds(): Promise<string[]> {
  if (!isRedisAvailable() || !getRedisClient()) {
    return [];
  }

  try {
    const tournamentIds: string[] = [];
    let cursor = '0';
    let iterations = 0;
    const client = getRedisClient()!;

    do {
      if (iterations++ > MAX_SCAN_ITERATIONS) {
        logger.warn('REDIS', 'SCAN exceeded max iterations for tournaments');
        break;
      }

      const result = await circuitBreaker.execute(() =>
        client.scan(cursor, 'MATCH', KEY_PATTERNS.tournaments, 'COUNT', SCAN_COUNT)
      );
      cursor = result[0];
      const keys = result[1];

      keys.forEach((key: string) => {
        const parts = key.split(':');
        if (parts.length >= 4) {
          tournamentIds.push(parts[parts.length - 1]);
        }
      });
    } while (cursor !== '0');

    return tournamentIds;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('REDIS', `Error getting tournament IDs: ${err.message}`);
    return [];
  }
}

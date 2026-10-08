/**
 * Redis state for the classroom economy: one hash per live game, one field
 * per student. Every write goes through `mutateEconomy`, which applies the
 * round boundary and the game lock, so no caller can skip either.
 *
 * Fails closed: with Redis down, reads return null and mutations award
 * nothing. A student never sees money that was not recorded.
 */

import { getRedisClient } from '../redisClient';
import {
  CLASSROOM_GAME_TTL,
  getClassroomGame,
  withClassroomGameLock,
  type ClassroomGame,
} from './classroomGameManager';
import { applyRoundBoundary, emptyEconomyState, type EconomyState } from './classroomEconomy';

export interface EconomyConfig {
  wrongAnswerCost: boolean;
  powerUps: boolean;
}

export function resolveConfig(game: Pick<ClassroomGame, 'settings'> | null | undefined): EconomyConfig {
  const economy = game?.settings?.economy;
  return {
    wrongAnswerCost: economy?.wrongAnswerCost === true,
    powerUps: economy?.powerUps !== false,
  };
}

const hashKey = (gameCode: string) => `classroom_econ:${gameCode}`;

function parseState(raw: string | null | undefined): EconomyState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EconomyState>;
    return { ...emptyEconomyState(), ...parsed };
  } catch {
    return null;
  }
}

export async function readEconomy(gameCode: string, userId: string): Promise<EconomyState | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    return parseState(await redis.hget(hashKey(gameCode), userId)) ?? emptyEconomyState();
  } catch {
    return null;
  }
}

export async function readAllEconomy(gameCode: string): Promise<Record<string, EconomyState> | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const all = (await redis.hgetall(hashKey(gameCode))) ?? {};
    const out: Record<string, EconomyState> = {};
    for (const [userId, raw] of Object.entries(all)) {
      const state = parseState(raw);
      if (state) out[userId] = state;
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Read-modify-write one student's economy under the game lock. `fn` returns the
 * next state plus whatever the caller needs back (delta, cost, purchase result).
 * Returns null when Redis is unavailable, so the caller withholds the award.
 */
export async function mutateEconomy<R>(
  gameCode: string,
  userId: string,
  roundId: string,
  fn: (state: EconomyState) => { state: EconomyState; result: R }
): Promise<R | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  return withClassroomGameLock(gameCode, async () => {
    try {
      const current = parseState(await redis.hget(hashKey(gameCode), userId)) ?? emptyEconomyState();
      const next = fn(applyRoundBoundary(current, roundId));
      await redis.hset(hashKey(gameCode), userId, JSON.stringify(next.state));
      await redis.expire(hashKey(gameCode), CLASSROOM_GAME_TTL);
      return next.result;
    } catch {
      return null;
    }
  });
}

export async function loadConfig(gameCode: string): Promise<EconomyConfig> {
  return resolveConfig(await getClassroomGame(gameCode));
}

export async function saveEconomyConfig(gameCode: string, config: EconomyConfig): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  return withClassroomGameLock(gameCode, async () => {
    const game = await getClassroomGame(gameCode);
    if (!game) return false;
    const next = { ...game, settings: { ...game.settings, economy: { ...config } } };
    await redis.setex(`classroom_game:${gameCode}`, CLASSROOM_GAME_TTL, JSON.stringify(next));
    return true;
  });
}

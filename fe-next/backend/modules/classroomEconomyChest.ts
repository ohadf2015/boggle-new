/**
 * End-of-round reward chest. Server-authoritative: the roll is seeded from the
 * room, round and student. A claim-once key makes a replay return the reveal
 * that was already granted, never a second roll. Contents are cosmetic plus
 * XP only; nothing here touches coins.
 *
 * Fails closed: no claim, no row, no XP. A failed row write releases the claim
 * so a retry can still grant once the table is reachable.
 */

import { claimOnce, type ClaimResult } from '@/lib/server/claimOnce';
import { getRedisClient } from '../redisClient.js';
import { getSupabase } from '../modules/supabase/client.js';
import logger from '../utils/logger.js';
import { rollChest } from './classroomEconomy';
import type { ClassroomChestReveal } from '@/shared/constants/classroomEconomy';

export type ChestReveal = ClassroomChestReveal;

export interface RoundChestSummary {
  roundCash: number;
  rank: number | null;
  size: number;
}

export interface ChestDeps {
  claim: (key: string) => Promise<ClaimResult>;
  release: (key: string) => Promise<void>;
  insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  grantXp: (userId: string, amount: number) => Promise<void>;
  remember: (key: string, reveal: ChestReveal) => Promise<void>;
  recall: (key: string) => Promise<ChestReveal | null>;
}

export interface RoundChestInput {
  gameCode: string;
  roundId: string;
  userId: string;
  summary: RoundChestSummary;
}

export async function grantRoundChest(input: RoundChestInput, deps: ChestDeps = defaultChestDeps()): Promise<ChestReveal | null> {
  const key = `classroom-chest:${input.gameCode}:${input.roundId}:${input.userId}`;
  const claim = await deps.claim(key);
  if (claim === 'taken') return deps.recall(key);
  if (claim !== 'claimed') {
    logger.error('CLASSROOM_ECONOMY', `Chest withheld for ${input.userId} in ${input.gameCode}: claim ${claim}`);
    return null;
  }

  const chest = rollChest(`${input.gameCode}:${input.roundId}:${input.userId}`);
  const { error } = await deps.insert({
    game_code: input.gameCode,
    round_id: input.roundId,
    user_id: input.userId,
    rarity: chest.rarity,
    xp: chest.xp,
    item_id: chest.itemId,
  });
  if (error) {
    logger.error('CLASSROOM_ECONOMY', `Chest row failed for ${input.userId} in ${input.gameCode}: ${String(error)}`);
    await deps.release(key);
    return null;
  }
  try {
    await deps.grantXp(input.userId, chest.xp);
  } catch (err) {
    logger.error('CLASSROOM_ECONOMY', `Chest XP failed for ${input.userId}: ${(err as Error).message}`);
  }

  const reveal: ChestReveal = {
    gameCode: input.gameCode,
    roundId: input.roundId,
    rarity: chest.rarity,
    xp: chest.xp,
    itemId: chest.itemId,
    ...input.summary,
  };
  try {
    await deps.remember(key, reveal);
  } catch (err) {
    logger.error('CLASSROOM_ECONOMY', `Chest reveal not cached for ${input.userId}: ${(err as Error).message}`);
  }
  return reveal;
}

const REVEAL_TTL_SEC = 60 * 60 * 4;
const revealHash = (key: string) => `classroom_chest_reveal:${key}`;

function defaultChestDeps(): ChestDeps {
  return {
    claim: (key) => claimOnce(key),
    release: async (key) => {
      await getRedisClient()?.del(`once:${key}`);
    },
    insert: async (row) => {
      const supabase = getSupabase();
      if (!supabase) return { error: new Error('supabase not configured') };
      const { error } = await supabase.from('classroom_chest_rewards').insert(row);
      return { error };
    },
    grantXp: async (userId, amount) => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase.rpc('increment_player_xp', { p_player_id: userId, p_xp_amount: amount });
      if (error) throw new Error(error.message);
    },
    remember: async (key, reveal) => {
      const redis = getRedisClient();
      if (!redis) return;
      await redis.set(revealHash(key), JSON.stringify(reveal), 'EX', REVEAL_TTL_SEC);
    },
    recall: async (key) => {
      const redis = getRedisClient();
      if (!redis) return null;
      const raw = await redis.get(revealHash(key));
      return raw ? (JSON.parse(raw) as ChestReveal) : null;
    },
  };
}

/**
 * End-of-round reward chest. Server-authoritative: the roll is seeded from the
 * room, round and student. A claim-once key makes a replay return the reveal
 * that was already granted, never a second roll. Contents are cosmetic plus
 * XP only; nothing here touches coins.
 *
 * Fails closed: no claim, no row, no part, no XP. The row is written first so an
 * unmigrated table grants nothing at all; a failed part write removes the row.
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
  /** Idempotent: owning a part twice is a no-op. Throws on failure. */
  grantPart: (userId: string, partKey: string) => Promise<void>;
  removeRow: (row: { gameCode: string; roundId: string; userId: string }) => Promise<void>;
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
    await deps.grantPart(input.userId, chest.itemId);
  } catch (err) {
    logger.error('CLASSROOM_ECONOMY', `Chest part failed for ${input.userId} in ${input.gameCode}: ${(err as Error).message}`);
    await deps.removeRow({ gameCode: input.gameCode, roundId: input.roundId, userId: input.userId }).catch((cleanup) =>
      logger.error('CLASSROOM_ECONOMY', `Chest row cleanup failed for ${input.userId}: ${String(cleanup)}`)
    );
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
    removeRow: async ({ gameCode, roundId, userId }) => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase
        .from('classroom_chest_rewards')
        .delete()
        .eq('game_code', gameCode)
        .eq('round_id', roundId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    grantPart: async (userId, partKey) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error('supabase not configured');
      const { data, error } = await supabase.from('profiles').select('premium_avatar_parts').eq('id', userId).single();
      if (error) throw new Error(error.message);
      const owned = (data?.premium_avatar_parts as string[] | null) ?? [];
      if (owned.includes(partKey)) return;
      const { error: updateError } = await supabase.from('profiles').update({ premium_avatar_parts: [...owned, partKey] }).eq('id', userId);
      if (updateError) throw new Error(updateError.message);
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

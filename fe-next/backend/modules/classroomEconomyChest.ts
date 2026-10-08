/**
 * End-of-game reward chest. Server-authoritative: the roll is seeded from the
 * room, round and student, and a claim-once key stops a replay from rolling
 * again. Contents are cosmetic plus XP only; nothing here touches coins.
 */

import { claimOnce, type ClaimResult } from '@/lib/server/claimOnce';
import { getSupabase } from '../modules/supabase/client.js';
import logger from '../utils/logger.js';
import { rollChest, type ChestRoll } from './classroomEconomy';

export interface ChestDeps {
  claim: (key: string) => Promise<ClaimResult>;
  insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  grantXp: (userId: string, amount: number) => Promise<void>;
}

export interface ChestGrant extends ChestRoll {
  gameCode: string;
  roundId: string;
  userId: string;
}

export async function grantEndOfGameChest(
  input: { gameCode: string; roundId: string; userId: string },
  deps: ChestDeps = defaultChestDeps()
): Promise<ChestGrant | null> {
  const claim = await deps.claim(`classroom-chest:${input.gameCode}:${input.roundId}:${input.userId}`);
  if (claim !== 'claimed') return null;

  const chest = rollChest(`${input.gameCode}:${input.roundId}:${input.userId}`);
  const row = {
    game_code: input.gameCode,
    round_id: input.roundId,
    user_id: input.userId,
    rarity: chest.rarity,
    xp: chest.xp,
    item_id: chest.itemId,
  };
  const { error } = await deps.insert(row);
  if (error) {
    logger.error('CLASSROOM_ECONOMY', `Chest row failed for ${input.userId} in ${input.gameCode}: ${String(error)}`);
    return null;
  }
  try {
    await deps.grantXp(input.userId, chest.xp);
  } catch (err) {
    logger.error('CLASSROOM_ECONOMY', `Chest XP failed for ${input.userId}: ${(err as Error).message}`);
  }
  return { ...input, ...chest };
}

function defaultChestDeps(): ChestDeps {
  return {
    claim: (key) => claimOnce(key),
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
  };
}

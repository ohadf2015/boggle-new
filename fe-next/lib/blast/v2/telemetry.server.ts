import type { SupabaseClient } from '@supabase/supabase-js';
import { getPostHogServer } from '@/lib/posthog';
import { createAdminClient } from '@/utils/supabase/admin';
import { mergeUnlocksSeen } from './mergeUnlocksSeen';

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  const client = supabaseInstance ?? createAdminClient();
  if (!client) throw new Error('Supabase service role not configured');
  return client;
}

// For testing
export function setSupabaseInstance(instance: SupabaseClient) {
  supabaseInstance = instance;
}

export async function captureGameCompleted(
  distinctId: string,
  level: number,
  success: boolean
) {
  await getPostHogServer()?.capture({
    distinctId,
    event: 'game_completed',
    properties: { mode: 'blast', level, success },
  });
}

export async function grantVeteranBonus(userId: string): Promise<{ grantedCoins: number }> {
  const supabase = getSupabase();

  // Check if veteran_bonus_granted already written
  const result = await supabase
    .from('blast_progress')
    .select('unlocks_seen')
    .eq('user_id', userId)
    .single();
  const progress = result.data as any;

  if (progress?.unlocks_seen?.veteran_bonus_granted) {
    return { grantedCoins: 0 };
  }

  // Check if legacy Blast play history exists (any game_completed event with mode='blast')
  const rpcResult = await (supabase.rpc as any)('check_prior_blast_play', { user_id: userId });
  const hasPriorPlay = rpcResult.data;
  if (!hasPriorPlay) {
    return { grantedCoins: 0 };
  }

  // Mark granted, return 500 coins. Merge (not replace) so we don't wipe the
  // player's seen-tutorial flags that clear-level persists.
  const mergedUnlocks = mergeUnlocksSeen(
    (progress?.unlocks_seen as Record<string, boolean> | null) ?? null,
    { veteran_bonus_granted: true },
  );
  await (supabase.from('blast_progress') as any)
    .update({ unlocks_seen: mergedUnlocks })
    .eq('user_id', userId);

  return { grantedCoins: 500 };
}

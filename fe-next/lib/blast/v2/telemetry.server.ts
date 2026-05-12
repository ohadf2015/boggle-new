import { getPostHogServer } from '@/lib/posthog';
import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseInstance;
}

// For testing
export function setSupabaseInstance(instance: ReturnType<typeof createClient>) {
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
  const { data: progress } = await supabase
    .from('blast_progress')
    .select('unlocks_seen')
    .eq('user_id', userId)
    .single();

  if (progress?.unlocks_seen?.veteran_bonus_granted) {
    return { grantedCoins: 0 };
  }

  // Check if legacy Blast play history exists (any game_completed event with mode='blast')
  const { data: hasPriorPlay } = await supabase.rpc('check_prior_blast_play', { user_id: userId });
  if (!hasPriorPlay) {
    return { grantedCoins: 0 };
  }

  // Mark granted, return 500 coins
  await supabase
    .from('blast_progress')
    .update({ unlocks_seen: { veteran_bonus_granted: true } })
    .eq('user_id', userId);

  return { grantedCoins: 500 };
}

import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_ATTEMPTS = 4

/**
 * Adds streak freezes to player_engagement without a lost update: the write is
 * guarded on the count it read, so a concurrent decrement (Hunt hook) or a second
 * grant forces a re-read instead of being overwritten. Returns whether the
 * freezes were actually stored.
 */
export async function grantStreakFreezes(
  supabase: SupabaseClient,
  playerId: string,
  count: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { data: row } = await supabase
      .from('player_engagement')
      .select('streak_freezes_available')
      .eq('player_id', playerId)
      .maybeSingle()

    if (!row) {
      const { error } = await supabase
        .from('player_engagement')
        .insert({ player_id: playerId, streak_freezes_available: count })
      if (!error) return true
      if ((error as { code?: string }).code !== '23505') return false
      continue
    }

    const current = (row as { streak_freezes_available: number | null }).streak_freezes_available ?? 0
    const { data: updated, error } = await supabase
      .from('player_engagement')
      .update({ streak_freezes_available: current + count })
      .eq('player_id', playerId)
      .eq('streak_freezes_available', current)
      .select('player_id')
    if (error) return false
    if (updated && updated.length > 0) return true
  }
  return false
}

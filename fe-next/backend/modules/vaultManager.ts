/**
 * Vault Manager
 * Manages timed exclusive vault boards: twice-weekly boards that open for 6 hours
 * with shared leaderboards, then get "vaulted" permanently.
 */

import { getSupabase } from './supabaseServer';

// ==========================================
// Types
// ==========================================

export interface VaultBoard {
  id: string;
  board_name: string;
  grid: unknown;
  language: string;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
  created_at: string;
}

export interface VaultBoardScore {
  id: string;
  vault_board_id: string;
  player_id: string;
  score: number;
  words_found: number;
  played_at?: string;
  display_name?: string;
}

// ==========================================
// getActiveVault
// ==========================================

/**
 * Returns the currently active vault board, or null if none is open.
 */
export async function getActiveVault(): Promise<VaultBoard | null> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('vault_boards')
    .select('*')
    .eq('is_active', true)
    .order('opens_at', { ascending: false })
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch active vault: ${error.message}`);
  return (data as VaultBoard) ?? null;
}

// ==========================================
// getVaultLeaderboard
// ==========================================

/**
 * Returns top scores for a vault board, ordered by score descending.
 */
export async function getVaultLeaderboard(
  vaultId: string,
  limit = 50
): Promise<VaultBoardScore[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('vault_board_scores')
    .select('*, profiles(display_name)')
    .eq('vault_board_id', vaultId)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch vault leaderboard: ${error.message}`);
  return (data ?? []) as VaultBoardScore[];
}

// ==========================================
// submitVaultScore
// ==========================================

/**
 * Records or updates a player's vault score via upsert, keeping the best score.
 */
export async function submitVaultScore(
  vaultId: string,
  playerId: string,
  score: number,
  wordsFound: number
): Promise<VaultBoardScore | null> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('vault_board_scores')
    .upsert(
      {
        vault_board_id: vaultId,
        player_id: playerId,
        score,
        words_found: wordsFound,
        played_at: new Date().toISOString(),
      },
      { onConflict: 'vault_board_id,player_id' }
    )
    .select('*')
    .single();

  if (error) throw new Error(`Failed to submit vault score: ${error.message}`);
  return data as VaultBoardScore;
}

// ==========================================
// getUpcomingVaults
// ==========================================

/**
 * Returns the next scheduled vault boards that haven't opened yet.
 */
export async function getUpcomingVaults(limit = 5): Promise<VaultBoard[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('vault_boards')
    .select('*')
    .eq('is_active', false)
    .gt('opens_at', now)
    .order('opens_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch upcoming vaults: ${error.message}`);
  return (data ?? []) as VaultBoard[];
}

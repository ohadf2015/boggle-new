'use client';

/**
 * useVaultBoard Hook
 * Fetches active vault board and leaderboard via Supabase REST.
 * Provides countdown timer for closes_at.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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

export interface VaultScore {
  id: string;
  vault_board_id: string;
  player_id: string;
  score: number;
  words_found: number;
  display_name?: string;
}

export interface UseVaultBoardReturn {
  vault: VaultBoard | null;
  leaderboard: VaultScore[];
  timeRemaining: number;
  isActive: boolean;
  loading: boolean;
  refresh: () => void;
}

export function useVaultBoard(): UseVaultBoardReturn {
  const [vault, setVault] = useState<VaultBoard | null>(null);
  const [leaderboard, setLeaderboard] = useState<VaultScore[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchVault = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      // Fetch active vault
      const { data: vaultData, error: vaultError } = await supabase
        .from('vault_boards')
        .select('*')
        .eq('is_active', true)
        .order('opens_at', { ascending: false })
        .maybeSingle();

      if (vaultError || !vaultData) {
        setVault(null);
        setLeaderboard([]);
        setTimeRemaining(0);
        return;
      }

      setVault(vaultData as VaultBoard);
      setTimeRemaining(Math.max(0, new Date(vaultData.closes_at).getTime() - Date.now()));

      // Fetch leaderboard
      const { data: scores } = await supabase
        .from('vault_board_scores')
        .select('*, profiles(display_name)')
        .eq('vault_board_id', vaultData.id)
        .order('score', { ascending: false })
        .limit(50);

      setLeaderboard((scores ?? []) as VaultScore[]);
    } catch {
      // Vault is non-critical, fail silently
      setVault(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // Countdown timer
  useEffect(() => {
    if (!vault) return;

    const interval = setInterval(() => {
      setTimeRemaining(Math.max(0, new Date(vault.closes_at).getTime() - Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [vault]);

  return {
    vault,
    leaderboard,
    timeRemaining,
    isActive: vault !== null && timeRemaining > 0,
    loading,
    refresh: fetchVault,
  };
}

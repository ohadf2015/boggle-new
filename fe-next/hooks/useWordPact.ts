'use client';

/**
 * useWordPact Hook
 * Fetches and manages the player's Word Pact via Supabase REST.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface WordPactData {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_played_today: boolean;
  player2_played_today: boolean;
  active: boolean;
  streak: number;
}

export interface UseWordPactReturn {
  pact: WordPactData | null;
  partnerName: string;
  partnerAvatar: string | null;
  bothPlayed: boolean;
  youPlayed: boolean;
  partnerPlayed: boolean;
  multiplier: number;
  streak: number;
  loading: boolean;
  createPact: (friendId: string) => Promise<void>;
  dissolvePact: () => Promise<void>;
}

function computeMultiplier(youPlayed: boolean, partnerPlayed: boolean): number {
  if (youPlayed && partnerPlayed) return 1.5;
  if (youPlayed && !partnerPlayed) return 2.0;
  return 1.0;
}

export function useWordPact(): UseWordPactReturn {
  const { user } = useAuth();
  const [pact, setPact] = useState<WordPactData | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPact = useCallback(async () => {
    if (!user?.id || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase
        .from('word_pacts')
        .select('*')
        .eq('active', true)
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .single();

      if (!data) {
        setPact(null);
        setLoading(false);
        return;
      }

      setPact(data as WordPactData);

      const friendId = data.player1_id === user.id ? data.player2_id : data.player1_id;
      const { data: profile } = await supabase
        .from('public_profiles')
        .select('username, avatar_image')
        .eq('id', friendId)
        .single();

      setPartnerName(profile?.username ?? '');
      setPartnerAvatar(profile?.avatar_image ?? null);
    } catch {
      setPact(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPact();
  }, [fetchPact]);

  const isPlayer1 = pact?.player1_id === user?.id;
  const youPlayed = pact ? (isPlayer1 ? pact.player1_played_today : pact.player2_played_today) : false;
  const partnerPlayed = pact ? (isPlayer1 ? pact.player2_played_today : pact.player1_played_today) : false;
  const bothPlayed = youPlayed && partnerPlayed;
  const multiplier = computeMultiplier(youPlayed, partnerPlayed);

  const handleCreatePact = useCallback(async (friendId: string) => {
    if (!user?.id || !supabase) return;
    await supabase.from('word_pacts').insert({
      player1_id: user.id,
      player2_id: friendId,
      active: true,
      streak: 0,
      player1_played_today: false,
      player2_played_today: false,
    });
    await fetchPact();
  }, [user?.id, fetchPact]);

  const handleDissolvePact = useCallback(async () => {
    if (!pact?.id || !supabase) return;
    await supabase.from('word_pacts').update({ active: false }).eq('id', pact.id);
    setPact(null);
  }, [pact?.id]);

  return {
    pact,
    partnerName,
    partnerAvatar,
    bothPlayed,
    youPlayed,
    partnerPlayed,
    multiplier,
    streak: pact?.streak ?? 0,
    loading,
    createPact: handleCreatePact,
    dissolvePact: handleDissolvePact,
  };
}

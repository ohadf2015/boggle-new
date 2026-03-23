/**
 * useAsyncChallenge Hook
 *
 * Fetches pending/active async board challenges for the current user
 * (both sent and received). Provides functions to create, accept,
 * submit results, and decline challenges via Supabase.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type {
  AsyncBoardChallenge,
  CreateAsyncChallengePayload,
  SubmitAsyncChallengePayload,
} from '@/shared/types/growth';

export interface UseAsyncChallengeReturn {
  challenges: AsyncBoardChallenge[];
  pendingCount: number;
  loading: boolean;
  createChallenge: (payload: CreateAsyncChallengePayload) => Promise<AsyncBoardChallenge | null>;
  acceptChallenge: (challengeId: string) => Promise<boolean>;
  submitResult: (payload: SubmitAsyncChallengePayload) => Promise<boolean>;
  declineChallenge: (challengeId: string) => Promise<boolean>;
}

function parseRow(row: Record<string, unknown>): AsyncBoardChallenge {
  const grid = typeof row.letter_grid === 'string'
    ? JSON.parse(row.letter_grid as string)
    : row.letter_grid;
  const challengerWords = typeof row.challenger_words === 'string'
    ? JSON.parse(row.challenger_words as string)
    : (row.challenger_words ?? []);
  const challengedWords = typeof row.challenged_words === 'string'
    ? JSON.parse(row.challenged_words as string)
    : (row.challenged_words ?? undefined);

  return {
    id: row.id as string,
    challengerId: row.challenger_id as string,
    challengerName: row.challenger_name as string | undefined,
    challengerAvatar: row.challenger_avatar as string | undefined,
    challengedId: row.challenged_id as string,
    challengedName: row.challenged_name as string | undefined,
    challengedAvatar: row.challenged_avatar as string | undefined,
    gameMode: row.game_mode as AsyncBoardChallenge['gameMode'],
    letterGrid: grid as string[][],
    gridSize: row.grid_size as number,
    challengerScore: row.challenger_score as number,
    challengerWords: challengerWords as string[],
    challengerBestWord: row.challenger_best_word as string | undefined,
    challengedScore: row.challenged_score as number | undefined,
    challengedWords: challengedWords as string[] | undefined,
    challengedBestWord: row.challenged_best_word as string | undefined,
    status: row.status as AsyncBoardChallenge['status'],
    message: row.message as string | undefined,
    createdAt: row.created_at as string,
    playedAt: row.played_at as string | undefined,
    expiresAt: row.expires_at as string,
  };
}

export function useAsyncChallenge(): UseAsyncChallengeReturn {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<AsyncBoardChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchChallenges = useCallback(async () => {
    if (!user?.id || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('async_board_challenges')
        .select('*')
        .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
        .in('status', ['pending', 'accepted', 'completed'])
        .order('created_at', { ascending: false });

      if (error || !data) {
        setChallenges([]);
      } else {
        setChallenges(data.map((r) => parseRow(r as Record<string, unknown>)));
      }
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchChallenges();
  }, [fetchChallenges]);

  const createChallenge = useCallback(
    async (payload: CreateAsyncChallengePayload): Promise<AsyncBoardChallenge | null> => {
      if (!user?.id || !supabase) return null;

      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data, error } = await supabase
          .from('async_board_challenges')
          .insert({
            challenger_id: user.id,
            challenged_id: payload.challengedId,
            game_mode: payload.gameMode,
            letter_grid: JSON.stringify(payload.letterGrid),
            grid_size: payload.gridSize,
            challenger_score: payload.score,
            challenger_words: JSON.stringify(payload.words),
            challenger_best_word: payload.bestWord,
            message: payload.message,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
          })
          .select('*')
          .single();

        if (error || !data) return null;

        const challenge = parseRow(data as Record<string, unknown>);
        setChallenges((prev) => [challenge, ...prev]);
        return challenge;
      } catch {
        return null;
      }
    },
    [user?.id],
  );

  const acceptChallenge = useCallback(
    async (challengeId: string): Promise<boolean> => {
      if (!user?.id || !supabase) return false;

      try {
        const { error } = await supabase
          .from('async_board_challenges')
          .update({ status: 'accepted' })
          .eq('id', challengeId)
          .eq('challenged_id', user.id);

        if (error) return false;

        setChallenges((prev) =>
          prev.map((c) => (c.id === challengeId ? { ...c, status: 'accepted' as const } : c)),
        );
        return true;
      } catch {
        return false;
      }
    },
    [user?.id],
  );

  const submitResult = useCallback(
    async (payload: SubmitAsyncChallengePayload): Promise<boolean> => {
      if (!user?.id || !supabase) return false;

      try {
        const { error } = await supabase
          .from('async_board_challenges')
          .update({
            challenged_score: payload.score,
            challenged_words: JSON.stringify(payload.words),
            challenged_best_word: payload.bestWord,
            status: 'completed',
            played_at: new Date().toISOString(),
          })
          .eq('id', payload.challengeId)
          .eq('challenged_id', user.id);

        if (error) return false;

        setChallenges((prev) =>
          prev.map((c) =>
            c.id === payload.challengeId
              ? {
                  ...c,
                  challengedScore: payload.score,
                  challengedWords: payload.words,
                  challengedBestWord: payload.bestWord,
                  status: 'completed' as const,
                  playedAt: new Date().toISOString(),
                }
              : c,
          ),
        );
        return true;
      } catch {
        return false;
      }
    },
    [user?.id],
  );

  const declineChallenge = useCallback(
    async (challengeId: string): Promise<boolean> => {
      if (!user?.id || !supabase) return false;

      try {
        const { error } = await supabase
          .from('async_board_challenges')
          .update({ status: 'declined' })
          .eq('id', challengeId)
          .eq('challenged_id', user.id);

        if (error) return false;

        setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
        return true;
      } catch {
        return false;
      }
    },
    [user?.id],
  );

  const pendingCount = challenges.filter(
    (c) => c.status === 'pending' && c.challengedId === user?.id,
  ).length;

  return {
    challenges,
    pendingCount,
    loading,
    createChallenge,
    acceptChallenge,
    submitResult,
    declineChallenge,
  };
}

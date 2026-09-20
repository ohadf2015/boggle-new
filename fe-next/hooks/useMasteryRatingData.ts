'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { AttemptRecord } from '@/lib/daily/rating';

export interface UseMasteryRatingDataProps {
  playerId?: string | null;
  guestFingerprint?: string | null;
  language: string;
  enabled?: boolean;
}

/**
 * Fetch player's Word Hunt attempt history for mastery rating computation
 *
 * - Works for both authed and guest players
 * - Queries daily_word_hunt_attempts, ordered by puzzle_date ascending
 * - Converts to AttemptRecord format for rating computation
 */
export function useMasteryRatingData({
  playerId,
  guestFingerprint,
  language,
  enabled = true,
}: UseMasteryRatingDataProps) {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || (!playerId && !guestFingerprint)) {
      setAttempts([]);
      return;
    }

    async function fetchAttempts() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const query = supabase
          .from('daily_word_hunt_attempts')
          .select('puzzle_date, solved, attempts_used')
          .eq('language', language)
          .order('puzzle_date', { ascending: true });

        // Scope to player or guest
        if (playerId) {
          query.eq('player_id', playerId);
        } else if (guestFingerprint) {
          query.eq('guest_fingerprint', guestFingerprint);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          setError(fetchError.message);
          setAttempts([]);
          return;
        }

        if (!data) {
          setAttempts([]);
          return;
        }

        // Convert to AttemptRecord format
        const records: AttemptRecord[] = data.map((row: { solved: boolean; attempts_used: number }) => ({
          solved: row.solved,
          attempts_used: row.attempts_used,
        }));

        setAttempts(records);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAttempts();
  }, [playerId, guestFingerprint, language, enabled]);

  return { attempts, loading, error };
}

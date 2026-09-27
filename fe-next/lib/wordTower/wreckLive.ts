/**
 * Live wrecking-ball hit notifications.
 *
 * `word_tower_pending_wrecks` is already the authoritative, server-claimed
 * queue (see app/api/word-tower/wreck/route.ts) — a defender picks up any
 * pending hits once via GET on session start. That leaves a gap: if the
 * defender is ALREADY mid-session when the hit lands, they don't find out
 * until their next reload (founder ask: "show scene of the tower hit to the
 * player who got hit").
 *
 * This subscribes to INSERTs on that table for the current user and treats
 * them as a pure "wake up and re-claim" doorbell — it never reads the
 * realtime payload as game state. The caller re-runs the SAME trusted GET
 * claim it already uses on mount, so damage numbers always come from the
 * server, never from a realtime event a client could theoretically spoof.
 */
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToWordTowerWrecks(userId: string, onHit: () => void): () => void {
  if (!userId) return () => {};

  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    .channel(`word-tower-wrecks:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'word_tower_pending_wrecks',
        filter: `defender_id=eq.${userId}`,
      },
      () => onHit(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

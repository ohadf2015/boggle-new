/**
 * Reads every raw row the education dashboard needs, one PostgREST page at a time.
 * Every query orders by a unique column, so paging is stable across pages.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from './fetchAllRows';
import { migrationPendingHint, type PostgrestLikeError } from '@/lib/supabase/migrationPendingHint';
import type { EduRawRows, RawRound } from './eduDashboardInput';

export type FetchEduRowsResult = { ok: true; raw: EduRawRows } | { ok: false; error: string };

export async function fetchEduRawRows(supabase: SupabaseClient, sinceIso: string): Promise<FetchEduRowsResult> {
  const profiles = await fetchAllRows((from, to) =>
    supabase
      .from('profiles')
      .select('id, user_role, last_seen_at, display_name, username, is_test_account')
      .eq('user_role', 'teacher')
      .order('id')
      .range(from, to),
  );
  const requests = await fetchAllRows((from, to) =>
    supabase
      .from('teacher_access_requests')
      .select('id, user_id, email, status, reviewed_at, trial_expires_at')
      .order('id')
      .range(from, to),
  );
  const classrooms = await fetchAllRows((from, to) =>
    supabase.from('classrooms').select('id, teacher_id, name, join_code').order('id').range(from, to),
  );
  const memberships = await fetchAllRows((from, to) =>
    supabase
      .from('classroom_memberships')
      .select('id, classroom_id, student_id')
      .order('id')
      .range(from, to),
  );
  const subscriptions = await fetchAllRows((from, to) =>
    supabase
      .from('subscriptions')
      .select('id, user_id, status, created_at')
      .eq('status', 'active')
      .order('id')
      .range(from, to),
  );

  let outreachError: PostgrestLikeError | null = null;
  const outreach = await fetchAllRows<{ teacher_id: string; channel: string; created_at: string }>((from, to) =>
    supabase
      .from('admin_edu_outreach')
      .select('id, teacher_id, channel, created_at')
      .order('id')
      .range(from, to)
      .then((res) => {
        outreachError = res.error ?? null;
        return res;
      }),
  );

  let roundsError: PostgrestLikeError | null = null;
  const rounds = await fetchAllRows<RawRound>((from, to) =>
    supabase
      .from('classroom_rounds')
      .select('id, classroom_id, teacher_id, game_mode, player_count, completed_at')
      .gte('completed_at', sinceIso)
      .order('id')
      .range(from, to)
      .then((res) => {
        roundsError = res.error ?? null;
        return res;
      }),
  );

  const failure = [profiles, requests, classrooms, memberships, subscriptions].find((r) => r.error);
  if (failure?.error) return { ok: false, error: failure.error };

  let outreachRows: Array<{ teacher_id: string; channel: string; created_at: string }> | null = outreach.data;
  if (outreach.error) {
    if (!migrationPendingHint(outreachError)) return { ok: false, error: outreach.error };
    outreachRows = null;
  }

  let roundsRows: RawRound[] | null = rounds.data;
  if (rounds.error) {
    if (!migrationPendingHint(roundsError)) return { ok: false, error: rounds.error };
    roundsRows = null;
  }

  return {
    ok: true,
    raw: {
      profiles: profiles.data,
      requests: requests.data,
      classrooms: classrooms.data,
      memberships: memberships.data,
      outreach: outreachRows,
      rounds: roundsRows,
      subscriptions: subscriptions.data,
    },
  };
}

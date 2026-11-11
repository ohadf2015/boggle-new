/**
 * Reads every raw row the education dashboard needs, one PostgREST page at a time; the tables are read together.
 * Every query orders by a unique column, so paging is stable across pages.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from './fetchAllRows';
import { migrationPendingHint, type PostgrestLikeError } from '@/lib/supabase/migrationPendingHint';
import { fetchLastSignIns, fetchLatestRoundStarts } from '@/lib/education/teacherLastActivity';
import type { EduRawRows, RawProfile, RawRound } from './eduDashboardInput';

export type FetchEduRowsResult = { ok: true; raw: EduRawRows } | { ok: false; error: string };

export async function fetchEduRawRows(supabase: SupabaseClient, sinceIso: string): Promise<FetchEduRowsResult> {
  const profilesQ = fetchAllRows((from, to) =>
    supabase
      .from('profiles')
      .select('id, user_role, last_seen_at, display_name, username, is_test_account')
      .eq('user_role', 'teacher')
      .order('id')
      .range(from, to),
  );
  const testAccountsQ = fetchAllRows<{ id: string; is_test_account: boolean | null }>((from, to) =>
    supabase.from('profiles').select('id, is_test_account').eq('is_test_account', true).order('id').range(from, to),
  );
  const requestsQ = fetchAllRows((from, to) =>
    supabase
      .from('teacher_access_requests')
      .select('id, user_id, email, status, reviewed_at, trial_expires_at')
      .order('id')
      .range(from, to),
  );
  const classroomsQ = fetchAllRows((from, to) =>
    supabase.from('classrooms').select('id, teacher_id, name, join_code').order('id').range(from, to),
  );
  const membershipsQ = fetchAllRows((from, to) =>
    supabase
      .from('classroom_memberships')
      .select('id, classroom_id, student_id')
      .order('id')
      .range(from, to),
  );
  const subscriptionsQ = fetchAllRows((from, to) =>
    supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('tier', 'pro')
      .order('id')
      .range(from, to),
  );

  let outreachError: PostgrestLikeError | null = null;
  const outreachQ = fetchAllRows<{ teacher_id: string; channel: string; created_at: string }>((from, to) =>
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
  const roundsQ = fetchAllRows<RawRound>((from, to) =>
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

  const [profiles, testAccounts, requests, classrooms, memberships, subscriptions, outreach, rounds] = await Promise.all([
    profilesQ, testAccountsQ, requestsQ, classroomsQ, membershipsQ, subscriptionsQ, outreachQ, roundsQ,
  ]);

  const failure = [profiles, testAccounts, requests, classrooms, memberships, subscriptions].find((r) => r.error);
  if (failure?.error) return { ok: false, error: failure.error };

  const teacherIds = profiles.data.map((p) => p.id);
  const [signIns, roundStarts] = await Promise.all([
    fetchLastSignIns(supabase, teacherIds),
    fetchLatestRoundStarts(supabase, teacherIds),
  ]);
  if (roundStarts.error) return { ok: false, error: roundStarts.error };
  const stampedProfiles: RawProfile[] = profiles.data.map((p) => ({
    ...p,
    last_sign_in_at: signIns.get(p.id) ?? null,
    last_round_started_at: roundStarts.unavailable ? null : (roundStarts.byTeacher.get(p.id) ?? null),
  }));

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
      profiles: stampedProfiles,
      testAccountIds: testAccounts.data.filter((p) => p.is_test_account === true).map((p) => p.id),
      requests: requests.data,
      classrooms: classrooms.data,
      memberships: memberships.data,
      outreach: outreachRows,
      rounds: roundsRows,
      subscriptions: subscriptions.data,
    },
  };
}

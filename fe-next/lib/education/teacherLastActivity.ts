/**
 * Last activity for a teacher is the latest of three clocks, not profiles.last_seen_at
 * alone. last_seen_at sticks at signup for teachers who never hit the bump path;
 * a classroom round or an auth sign-in is still a return.
 *
 * Pure comparison lives here so the dashboard, funnel, activity drill-down and
 * class detail cannot drift. The fetches are the read-side join: profiles.id =
 * auth.users.id via the admin API (auth schema is not on PostgREST), and the
 * latest classroom_rounds.started_at for that teacher.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/lib/admin/fetchAllRows';
import { migrationPendingHint, type PostgrestLikeError } from '@/lib/supabase/migrationPendingHint';

const IN_CHUNK = 100;
const SIGN_IN_CONCURRENCY = 8;

/** Latest parseable timestamp. Nulls and junk are ignored. Returns the winning input string, not a reformatted one. */
export function greatestTimestamp(...values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = value;
    }
  }
  return best;
}

export interface RoundStartRow {
  teacher_id: string;
  started_at: string | null;
}

/** Max started_at per teacher. Rows with a null or unparseable start are skipped. */
export function latestRoundStartByTeacher(rows: RoundStartRow[]): Map<string, string> {
  const byTeacher = new Map<string, string>();
  for (const row of rows) {
    const next = greatestTimestamp(byTeacher.get(row.teacher_id), row.started_at);
    if (next) byTeacher.set(row.teacher_id, next);
  }
  return byTeacher;
}

type AuthAdmin = {
  getUserById?: (id: string) => PromiseLike<{
    data: { user: { last_sign_in_at?: string | null } | null } | null;
    error: { message?: string } | null;
  }>;
};

/**
 * auth.users.last_sign_in_at for the given profile ids. One getUserById per id —
 * listUsers walks the whole player base and has timed out on this project.
 * A missing admin client (route-test mocks) or a single lookup failure leaves
 * that id absent; it must not 500 a dashboard that still has the other two clocks.
 */
export async function fetchLastSignIns(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  // Call getUserById on the admin object. supabase-js GoTrueAdminApi reads this.fetch;
  // detaching the method throws TypeError and the catch below would drop every sign-in.
  const admin = (supabase as { auth?: { admin?: AuthAdmin } }).auth?.admin;
  if (!admin || typeof admin.getUserById !== 'function' || unique.length === 0) return out;

  let next = 0;
  async function worker() {
    while (next < unique.length) {
      const id = unique[next++];
      try {
        const { data, error } = await admin.getUserById(id);
        if (error) continue;
        const ts = data?.user?.last_sign_in_at;
        if (ts) out.set(id, ts);
      } catch {
        // one auth lookup must not blank the page
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(SIGN_IN_CONCURRENCY, unique.length) }, () => worker()));
  return out;
}

export interface LatestRoundStarts {
  byTeacher: Map<string, string>;
  /** True when classroom_rounds is not migrated. Callers then ignore the round clock. */
  unavailable: boolean;
  error: string | null;
}

/**
 * Latest classroom_rounds.started_at per teacher, not clipped to a KPI window.
 * A missing table is unavailable, not an error — same rule as the dashboard's
 * rounds KPI. Any other read failure is an error the route should surface.
 */
export async function fetchLatestRoundStarts(supabase: SupabaseClient, teacherIds: string[]): Promise<LatestRoundStarts> {
  const unique = [...new Set(teacherIds.filter(Boolean))];
  if (unique.length === 0) return { byTeacher: new Map(), unavailable: false, error: null };

  const rows: RoundStartRow[] = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const chunk = unique.slice(i, i + IN_CHUNK);
    let queryError: PostgrestLikeError | null = null;
    const page = await fetchAllRows<RoundStartRow & { id: string }>(async (from, to) => {
      const res = await supabase
        .from('classroom_rounds')
        .select('id, teacher_id, started_at')
        .in('teacher_id', chunk)
        .order('id')
        .range(from, to);
      queryError = (res.error ?? null) as PostgrestLikeError | null;
      return res;
    });
    if (page.error) {
      if (migrationPendingHint(queryError) || migrationPendingHint({ message: page.error })) {
        return { byTeacher: new Map(), unavailable: true, error: null };
      }
      return { byTeacher: new Map(), unavailable: false, error: page.error };
    }
    rows.push(...page.data);
  }
  return { byTeacher: latestRoundStartByTeacher(rows), unavailable: false, error: null };
}

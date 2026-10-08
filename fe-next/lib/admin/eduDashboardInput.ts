/**
 * Turns raw table rows into the assembler's input. Pure: the test-account and machine
 * filters live here, so they are testable without a database and the SQL cross-check
 * (scripts/edu-dashboard) can feed unfiltered rows through the same code.
 */

import { isMachineRequest } from '@/lib/education/teacherFunnel';
import type { EduDashboardInput } from './eduDashboard';
import type { WindowDays } from './eduMetrics';

export interface RawProfile {
  id: string;
  user_role?: string | null;
  last_seen_at: string | null;
  display_name: string | null;
  username: string | null;
  is_test_account: boolean | null;
}

export interface RawRequest {
  user_id: string | null;
  email: string | null;
  status: string | null;
  reviewed_at: string | null;
  trial_expires_at: string | null;
}

export interface RawRound {
  classroom_id: string | null;
  teacher_id: string;
  game_mode: string;
  player_count: number;
  completed_at: string;
}

export interface EduRawRows {
  profiles: RawProfile[];
  requests: RawRequest[];
  classrooms: Array<{ id: string; teacher_id: string | null; name: string | null }>;
  memberships: Array<{ classroom_id: string; student_id: string }>;
  /** null when classroom_rounds is not migrated in this database. */
  rounds: RawRound[] | null;
  subscriptions: Array<{ user_id: string; status: string; created_at: string }>;
}

const toMs = (ts: string | null) => (ts ? Date.parse(ts) : NaN);

function personKey(r: { user_id: string | null; email: string | null }): string {
  return r.user_id ?? (r.email ?? '').trim().toLowerCase();
}

export function prepareEduDashboardInput(
  raw: EduRawRows,
  nowMs: number,
  windowDays: WindowDays,
): EduDashboardInput {
  const testIds = new Set(raw.profiles.filter((p) => p.is_test_account).map((p) => p.id));

  const teachers = raw.profiles
    .filter((p) => !p.is_test_account)
    .map((p) => ({
      id: p.id,
      name: (p.display_name ?? '').trim() || (p.username ?? '').trim() || null,
      last_seen_at: p.last_seen_at,
    }));

  const requests = raw.requests.filter(
    (r) => !isMachineRequest(r.email) && !(r.user_id && testIds.has(r.user_id)),
  );
  const requested = new Set(requests.map(personKey)).size;

  const latestApproval = new Map<string, { user_id: string | null; reviewed_at: string | null; trial_expires_at: string | null }>();
  for (const r of requests) {
    if (r.status !== 'approved') continue;
    const key = personKey(r);
    const prev = latestApproval.get(key);
    const reviewed = toMs(r.reviewed_at);
    if (!prev || reviewed > toMs(prev.reviewed_at)) {
      latestApproval.set(key, { user_id: r.user_id, reviewed_at: r.reviewed_at, trial_expires_at: r.trial_expires_at });
    }
  }
  const approvals = [...latestApproval.values()];

  const classrooms = raw.classrooms.filter((c) => !(c.teacher_id && testIds.has(c.teacher_id)));
  const classroomIds = new Set(classrooms.map((c) => c.id));
  const memberships = raw.memberships.filter((m) => classroomIds.has(m.classroom_id));

  const rounds = raw.rounds === null ? null : raw.rounds.filter((r) => !testIds.has(r.teacher_id));

  const earliestPaid = new Map<string, string>();
  for (const s of raw.subscriptions) {
    if (s.status !== 'active' || testIds.has(s.user_id)) continue;
    const prev = earliestPaid.get(s.user_id);
    if (!prev || toMs(s.created_at) < toMs(prev)) earliestPaid.set(s.user_id, s.created_at);
  }
  const subscriptions = [...earliestPaid].map(([user_id, created_at]) => ({ user_id, status: 'active', created_at }));

  return {
    nowMs,
    windowDays,
    teachers,
    approvals,
    requested,
    classrooms,
    memberships,
    rounds,
    subscriptions,
  };
}

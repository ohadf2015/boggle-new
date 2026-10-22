// Which "make your first class" email an approved teacher with no classroom is owed.
// Pure so the schedule and exclusions are testable without a DB or an email provider.

import { isMachineRequest } from './teacherFunnel';
import type { TeacherLocale } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const ACTIVATION_NUDGE_BUCKETS = ['d1', 'd3', 'd7'] as const;
export type ActivationNudgeBucket = (typeof ACTIVATION_NUDGE_BUCKETS)[number];

const THRESHOLD_DAYS: Record<ActivationNudgeBucket, number> = { d1: 1, d3: 3, d7: 7 };

/** A teacher approved months ago gets nothing: a first-week nudge that late reads as spam. */
export const MAX_DAYS_SINCE_APPROVAL = 14;

const LOCALES: readonly TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

/** The latest due bucket not yet sent, or null. A missed run sends late, never twice. */
export function pickActivationNudge(
  approvedAtISO: string | null | undefined,
  alreadySent: readonly string[] | null | undefined,
  nowMs: number,
): ActivationNudgeBucket | null {
  if (!approvedAtISO) return null;
  const approved = Date.parse(approvedAtISO);
  if (Number.isNaN(approved)) return null;

  const days = (nowMs - approved) / DAY_MS;
  if (days > MAX_DAYS_SINCE_APPROVAL) return null;

  const sent = new Set(alreadySent ?? []);
  for (const bucket of [...ACTIVATION_NUDGE_BUCKETS].reverse()) {
    if (days >= THRESHOLD_DAYS[bucket]) return sent.has(bucket) ? null : bucket;
  }
  return null;
}

export interface ActivationNudgeRow {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  locale: string | null;
  reviewed_at: string | null;
  activation_nudges_sent: string[] | null;
}

export interface ActivationNudgeExclusions {
  classroomTeacherIds: ReadonlySet<string>;
  testUserIds: ReadonlySet<string>;
  proUserIds: ReadonlySet<string>;
}

export interface ActivationNudgeDue {
  email: string;
  full_name: string;
  locale: TeacherLocale;
  bucket: ActivationNudgeBucket;
  rowIds: string[];
  alreadySent: string[];
}

export interface ActivationNudgePlan {
  due: ActivationNudgeDue[];
  skipped: { hasClassroom: number; testAccount: number; hasPro: number };
}

function asLocale(raw: string | null | undefined): TeacherLocale {
  return LOCALES.includes(raw as TeacherLocale) ? (raw as TeacherLocale) : 'en';
}

/**
 * One decision per email address, not per row: a teacher who submitted the access form
 * twice must not get a bucket twice, so ledgers are merged and every row is marked.
 */
export function planActivationNudges(
  rows: readonly ActivationNudgeRow[],
  { classroomTeacherIds, testUserIds, proUserIds }: ActivationNudgeExclusions,
  nowMs: number,
): ActivationNudgePlan {
  const byEmail = new Map<string, ActivationNudgeRow[]>();
  for (const r of rows) {
    const key = (r.email ?? '').trim().toLowerCase();
    if (!key) continue;
    const group = byEmail.get(key);
    if (group) group.push(r);
    else byEmail.set(key, [r]);
  }

  const plan: ActivationNudgePlan = { due: [], skipped: { hasClassroom: 0, testAccount: 0, hasPro: 0 } };
  for (const [email, group] of byEmail) {
    const userIds = group.map((r) => r.user_id).filter((id): id is string => Boolean(id));
    if (isMachineRequest(email) || userIds.some((id) => testUserIds.has(id))) {
      plan.skipped.testAccount++;
      continue;
    }
    if (userIds.some((id) => classroomTeacherIds.has(id))) {
      plan.skipped.hasClassroom++;
      continue;
    }
    if (userIds.some((id) => proUserIds.has(id))) {
      plan.skipped.hasPro++;
      continue;
    }

    const alreadySent = [...new Set(group.flatMap((r) => r.activation_nudges_sent ?? []))];
    const approvals = group
      .map((r) => (r.reviewed_at ? Date.parse(r.reviewed_at) : NaN))
      .filter((t) => !Number.isNaN(t));
    if (approvals.length === 0) continue;
    const firstApproved = new Date(Math.min(...approvals)).toISOString();

    const bucket = pickActivationNudge(firstApproved, alreadySent, nowMs);
    if (!bucket) continue;

    const latest = group.reduce((a, b) => ((b.reviewed_at ?? '') > (a.reviewed_at ?? '') ? b : a));
    plan.due.push({
      email: latest.email.trim(),
      full_name: latest.full_name,
      locale: asLocale(latest.locale),
      bucket,
      rowIds: group.map((r) => r.id),
      alreadySent,
    });
  }
  return plan;
}

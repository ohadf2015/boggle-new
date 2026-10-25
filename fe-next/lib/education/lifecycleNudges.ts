// Stage-aware nudges after a teacher has a class, aimed at a second live game day.
// Pure so the schedule, caps and exclusions are testable without a DB or an email provider.

import { isMachineRequest } from './teacherFunnel';
import type { LedgerRow } from './lifecycleLedger';
import type { TeacherLocale } from './types';

const DAY_MS = 86_400_000;

export const LIFECYCLE_STAGES = ['share_code', 'start_live', 'second_game'] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const NUDGE_COOLDOWN_DAYS = 3;
const SHARE_CODE_AFTER_DAYS = 1;
const START_LIVE_AFTER_DAYS = 2;
const SECOND_GAME_WINDOW_DAYS = [3, 10] as const;

export const stageLedgerKind = (stage: LifecycleStage | 'reactivate') => `nudge:${stage}`;
const isNudgeKind = (kind: string) => kind.startsWith('nudge:') || kind.startsWith('activation:');

export interface StageTeacher {
  userId: string;
  email: string;
  fullName: string;
  locale: TeacherLocale;
}

export interface StageFacts {
  classrooms: Array<{ id: string; teacherId: string; createdAt: string }>;
  /** Students per classroom, the teacher's own preview seat excluded. */
  studentCounts: ReadonlyMap<string, number>;
  /** Rounds with 2+ players. */
  realRounds: Array<{ teacherId: string; completedAt: string }>;
  ledger: readonly LedgerRow[];
  testUserIds: ReadonlySet<string>;
}

export interface LifecycleNudgePlan {
  due: Array<StageTeacher & { stage: LifecycleStage }>;
  skipped: { testAccount: number; cooldown: number };
}

const ageDays = (iso: string, nowMs: number) => (nowMs - Date.parse(iso)) / DAY_MS;
const utcDay = (iso: string) => Math.floor(Date.parse(iso) / DAY_MS);

function pickStage(t: StageTeacher, f: StageFacts, nowMs: number): LifecycleStage | null {
  const classes = f.classrooms.filter((c) => c.teacherId === t.userId);
  if (classes.length === 0) return null;
  const sent = new Set(f.ledger.filter((r) => r.user_id === t.userId).map((r) => r.kind));
  const owed = (stage: LifecycleStage) => (sent.has(stageLedgerKind(stage)) ? null : stage);

  const rounds = f.realRounds.filter((r) => r.teacherId === t.userId);
  if (rounds.length > 0) {
    if (new Set(rounds.map((r) => utcDay(r.completedAt))).size > 1) return null;
    const firstAge = Math.max(...rounds.map((r) => ageDays(r.completedAt, nowMs)));
    const [from, to] = SECOND_GAME_WINDOW_DAYS;
    return firstAge >= from && firstAge <= to ? owed('second_game') : null;
  }

  const withStudents = classes.filter((c) => (f.studentCounts.get(c.id) ?? 0) > 0);
  if (withStudents.length > 0) {
    const oldest = Math.max(...withStudents.map((c) => ageDays(c.createdAt, nowMs)));
    return oldest >= START_LIVE_AFTER_DAYS ? owed('start_live') : null;
  }

  const oldest = Math.max(...classes.map((c) => ageDays(c.createdAt, nowMs)));
  return oldest >= SHARE_CODE_AFTER_DAYS ? owed('share_code') : null;
}

export function planLifecycleNudges(
  teachers: readonly StageTeacher[],
  facts: StageFacts,
  nowMs: number,
): LifecycleNudgePlan {
  const plan: LifecycleNudgePlan = { due: [], skipped: { testAccount: 0, cooldown: 0 } };
  const seenEmails = new Set<string>();
  for (const t of teachers) {
    const email = t.email.trim().toLowerCase();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);
    if (isMachineRequest(email) || facts.testUserIds.has(t.userId)) {
      plan.skipped.testAccount++;
      continue;
    }
    const stage = pickStage(t, facts, nowMs);
    if (!stage) continue;
    const recent = facts.ledger.some(
      (r) => r.user_id === t.userId && isNudgeKind(r.kind) && ageDays(r.sent_at, nowMs) < NUDGE_COOLDOWN_DAYS,
    );
    if (recent) {
      plan.skipped.cooldown++;
      continue;
    }
    plan.due.push({ ...t, stage });
  }
  return plan;
}

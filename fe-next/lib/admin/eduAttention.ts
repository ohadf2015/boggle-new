/**
 * One prioritized "needs attention" list for the education dashboard. Each teacher appears
 * once, under the most urgent reason that applies; the order of ATTENTION_ORDER is the
 * priority (access first, revenue next, then the earliest step a teacher is stuck on).
 */

import type { ClassRow, TeacherRow } from './eduDashboard';

export const ATTENTION_ORDER = [
  'locked_out',
  'trial_ending',
  'no_students',
  'class_stalled',
  'no_class',
  'went_quiet',
] as const;
export type AttentionKind = (typeof ATTENTION_ORDER)[number];

export interface AttentionItem {
  kind: AttentionKind;
  teacherId: string;
  classId: string | null;
  className: string | null;
  /** Trial end for `trial_ending`, otherwise null. */
  dueAt: string | null;
}

export interface AttentionList {
  items: AttentionItem[];
  total: number;
}

const DAY_MS = 86_400_000;
const TRIAL_ENDING_DAYS = 7;
const ATTENTION_LIMIT = 12;

const toMs = (ts: string | null) => (ts ? Date.parse(ts) : NaN);

export function buildAttention(input: {
  teachers: TeacherRow[];
  dyingClasses: ClassRow[];
  roundsAvailable: boolean;
  nowMs: number;
}): AttentionList {
  const { teachers, dyingClasses, roundsAvailable, nowMs } = input;
  const stalledClassOf = new Map<string, ClassRow>();
  for (const c of [...dyingClasses].sort((a, b) => b.students - a.students)) {
    if (c.teacherId && !stalledClassOf.has(c.teacherId)) stalledClassOf.set(c.teacherId, c);
  }

  const reasonFor = (t: TeacherRow): AttentionItem | null => {
    const item = (kind: AttentionKind, extra: Partial<AttentionItem> = {}): AttentionItem => ({
      kind,
      teacherId: t.id,
      classId: null,
      className: null,
      dueAt: null,
      ...extra,
    });
    if (t.stage === 'locked_out') return item('locked_out');
    const trialEnd = toMs(t.trialExpiresAt);
    if (!t.paying && trialEnd > nowMs && trialEnd - nowMs <= TRIAL_ENDING_DAYS * DAY_MS) {
      return item('trial_ending', { dueAt: t.trialExpiresAt });
    }
    if (t.stage === 'no_students') return item('no_students');
    const stalled = stalledClassOf.get(t.id);
    if (roundsAvailable && stalled) return item('class_stalled', { classId: stalled.id, className: stalled.name });
    if (t.stage === 'no_class') return item('no_class');
    if (roundsAvailable && t.health === 'at_risk' && t.students > 0) return item('went_quiet');
    return null;
  };

  const lastActiveOf = new Map(teachers.map((t) => [t.id, toMs(t.lastActiveAt)]));
  const recency = (id: string) => {
    const ms = lastActiveOf.get(id);
    return ms === undefined || Number.isNaN(ms) ? -Infinity : ms;
  };
  const items = teachers
    .map(reasonFor)
    .filter((i): i is AttentionItem => i !== null)
    .sort(
      (a, b) =>
        ATTENTION_ORDER.indexOf(a.kind) - ATTENTION_ORDER.indexOf(b.kind) ||
        recency(b.teacherId) - recency(a.teacherId),
    );
  return { items: items.slice(0, ATTENTION_LIMIT), total: items.length };
}

import type { ClassAnalytics } from './classAnalyticsServer';
import type { StudentStatus } from './classInsights';
import type { HardWord } from '@/lib/education/wordMasteryReport';

const ATTENTION: readonly StudentStatus[] = ['needsHelp', 'inactive', 'notStarted'];
const STATUSES: readonly StudentStatus[] = ['needsHelp', 'inactive', 'notStarted', 'steady', 'thriving'];

export interface FreeClassPulse {
  needsHelp: { id: string; status: StudentStatus }[];
  counts: Record<StudentStatus, number>;
  totalStudents: number;
}

/** What a free teacher's analytics read returns for their one free class: this week only, no per-student numbers. */
export interface FreeClassInsight {
  pulse: FreeClassPulse;
  hardestWords: HardWord[];
  sessionsThisWeek: number;
}

const createdMs = (iso: string) => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
};

/** The class a free teacher gets this week's insight for: their oldest. Server and Home both call this. */
export function freeInsightClassId(rows: readonly { id: string; created_at: string }[]): string | null {
  const sorted = [...rows].sort((a, b) => createdMs(a.created_at) - createdMs(b.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sorted[0]?.id ?? null;
}

export function toFreeClassPulse(metrics: ClassAnalytics): FreeClassPulse {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<StudentStatus, number>;
  const needsHelp: FreeClassPulse['needsHelp'] = [];
  for (const s of metrics.students) {
    if (!STATUSES.includes(s.status)) continue;
    counts[s.status]++;
    if (ATTENTION.includes(s.status)) needsHelp.push({ id: s.id, status: s.status });
  }
  return { needsHelp, counts, totalStudents: metrics.totalStudents };
}

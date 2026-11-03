import type { WordsAttemptedRecord } from '@/lib/supabase/analyticsTypes';

export type StudentStatus = 'needsHelp' | 'inactive' | 'notStarted' | 'steady' | 'thriving';

export interface PulseRow {
  student_id: string;
  total_xp: number | null;
  last_practice_date: string | null;
  words_attempted: WordsAttemptedRecord | null;
}

export interface StudentPulse {
  id: string;
  status: StudentStatus;
  /** 0..1 over the last 7 days, null when nothing was attempted. */
  accuracy: number | null;
  attempts: number;
  xp: number;
  lastPractice: string | null;
  /** Distinct last-practice days in the last 7 days. */
  activeDays: number;
}

export interface DailyActive {
  day: string;
  count: number;
}

export const NEEDS_HELP_ACCURACY = 0.6;
const THRIVING_ACCURACY = 0.8;
const THRIVING_DAYS = 3;
const WINDOW_DAYS = 7;

const ORDER: Record<StudentStatus, number> = { needsHelp: 0, inactive: 1, notStarted: 2, steady: 3, thriving: 4 };

function daysBefore(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
}

/** Rows of ALL time per student: recency needs the full history, accuracy only the week. */
export function buildStudentPulses(rows: PulseRow[], studentIds: string[], today: string): StudentPulse[] {
  const since = daysBefore(today, WINDOW_DAYS);
  const byStudent = new Map<string, PulseRow[]>();
  for (const r of rows) {
    const list = byStudent.get(r.student_id);
    if (list) list.push(r);
    else byStudent.set(r.student_id, [r]);
  }

  const pulses = studentIds.map((id): StudentPulse => {
    const mine = byStudent.get(id) ?? [];
    let xp = 0;
    let correct = 0;
    let attempts = 0;
    let lastPractice: string | null = null;
    const days = new Set<string>();
    for (const r of mine) {
      xp += r.total_xp || 0;
      const d = r.last_practice_date;
      if (d && (!lastPractice || d > lastPractice)) lastPractice = d;
      if (!d || d < since) continue;
      days.add(d);
      for (const w of Object.values(r.words_attempted ?? {})) {
        if (!w) continue;
        correct += w.correct || 0;
        attempts += w.attempts || 0;
      }
    }
    const accuracy = attempts > 0 ? correct / attempts : null;
    const activeDays = days.size;

    let status: StudentStatus;
    if (!lastPractice) status = 'notStarted';
    else if (lastPractice < since) status = 'inactive';
    else if (accuracy !== null && accuracy < NEEDS_HELP_ACCURACY) status = 'needsHelp';
    else if (accuracy !== null && accuracy >= THRIVING_ACCURACY && activeDays >= THRIVING_DAYS) status = 'thriving';
    else status = 'steady';

    return { id, status, accuracy, attempts, xp, lastPractice, activeDays };
  });

  return pulses.sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.accuracy ?? 1) - (b.accuracy ?? 1));
}

/** Students whose most recent practice (per lesson) fell on each of the last 7 days. */
export function buildDailyActive(rows: PulseRow[], today: string): DailyActive[] {
  const slots = Array.from({ length: WINDOW_DAYS }, (_, i) => daysBefore(today, WINDOW_DAYS - 1 - i));
  const seen = new Map<string, Set<string>>(slots.map((d) => [d, new Set<string>()]));
  for (const r of rows) {
    if (r.last_practice_date) seen.get(r.last_practice_date)?.add(r.student_id);
  }
  return slots.map((day) => ({ day, count: seen.get(day)?.size ?? 0 }));
}

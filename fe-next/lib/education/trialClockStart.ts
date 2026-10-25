import { teacherTrialExpiry } from './trial';
import { TRIAL_REMINDER_BUCKETS } from './trialReminders';

export interface TrialClockRow {
  trial_expires_at: string | null;
  trial_reminders_sent: string[] | null;
}

const REMINDER_BUCKETS = new Set<string>(TRIAL_REMINDER_BUCKETS);

/**
 * The access trial's clock starts at the teacher's first live game with a real class:
 * the deadline becomes at least TEACHER_TRIAL_DAYS from now (never shorter) and the
 * countdown reminders restart. Null when nothing should change.
 */
export function planTrialClockStart(row: TrialClockRow, nowMs: number): TrialClockRow | null {
  if (!row.trial_expires_at) return null;
  const current = Date.parse(row.trial_expires_at);
  const next = teacherTrialExpiry(nowMs);
  if (Number.isFinite(current) && current >= Date.parse(next)) return null;
  return {
    trial_expires_at: next,
    trial_reminders_sent: (row.trial_reminders_sent ?? []).filter((m) => !REMINDER_BUCKETS.has(m)),
  };
}

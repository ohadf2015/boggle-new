import { teacherTrialExpiry } from './trial';
import { TRIAL_REMINDER_BUCKETS } from './trialReminders';

export interface TrialClockRow {
  trial_expires_at: string | null;
  trial_reminders_sent: string[] | null;
}

const REMINDER_BUCKETS = new Set<string>(TRIAL_REMINDER_BUCKETS);

/**
 * Ledger marker (in `trial_reminders_sent`) for "the trial already restarted at the first
 * class game". The restart happens once per teacher, ever, so a later wipe of the round
 * history or a duplicate first-round event cannot hand out another 14 days.
 */
export const FIRST_GAME_RESTART_MARK = 'first_game_restart';

export function hasFirstGameRestart(row: Pick<TrialClockRow, 'trial_reminders_sent'>): boolean {
  return (row.trial_reminders_sent ?? []).includes(FIRST_GAME_RESTART_MARK);
}

/**
 * The access trial's clock starts at the teacher's first live game with a real class,
 * whether the window is still live or already ended: the deadline becomes 14 days from
 * now (TEACHER_TRIAL_DAYS, never shorter, never added on top) and the countdown reminders
 * restart. Once only. Null when nothing should change.
 */
export function planTrialClockStart(row: TrialClockRow, nowMs: number): TrialClockRow | null {
  if (!row.trial_expires_at) return null;
  if (hasFirstGameRestart(row)) return null;
  const current = Date.parse(row.trial_expires_at);
  const next = teacherTrialExpiry(nowMs);
  if (Number.isFinite(current) && current >= Date.parse(next)) return null;
  return {
    trial_expires_at: next,
    trial_reminders_sent: [
      ...(row.trial_reminders_sent ?? []).filter((m) => !REMINDER_BUCKETS.has(m)),
      FIRST_GAME_RESTART_MARK,
    ],
  };
}

/** Just the once-only marker, for a teacher whose restart went to the card trial instead. */
export function markFirstGameRestart(row: TrialClockRow): Pick<TrialClockRow, 'trial_reminders_sent'> | null {
  if (hasFirstGameRestart(row)) return null;
  return { trial_reminders_sent: [...(row.trial_reminders_sent ?? []), FIRST_GAME_RESTART_MARK] };
}

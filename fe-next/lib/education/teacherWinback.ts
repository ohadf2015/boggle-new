/**
 * In-product recall for approved teachers who never started Teacher Pro.
 *
 * Since Nov 2026 approval does not stamp a cardless access window. The Polar
 * 14-day trial is the only trial, and these teachers had no dashboard ask
 * until they dismissed this one. A live trial, a used trial, or Pro already
 * paid is someone else's banner — never a second one.
 */

type StorageLike = { getItem?: (key: string) => string | null; setItem?: (key: string, value: string) => void } | null | undefined;

export const TEACHER_WINBACK_DISMISS_KEY = 'lexiclash.teacher_winback_dismissed';

export interface TeacherWinbackSignals {
  /** Latest teacher-access request is approved. Role alone is not enough. */
  approved: boolean;
  hasPro: boolean;
  /** Started a Polar trial, whether it is still running or already finished. */
  trialUsed: boolean;
  /** A Polar or access trial is running right now. */
  activeTrial: boolean;
  dismissed: boolean;
}

export function teacherWinbackEligible(s: TeacherWinbackSignals): boolean {
  return s.approved && !s.hasPro && !s.trialUsed && !s.activeTrial && !s.dismissed;
}

export function isTeacherWinbackDismissed(storage: StorageLike): boolean {
  try {
    return storage?.getItem?.(TEACHER_WINBACK_DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function persistTeacherWinbackDismissed(storage: StorageLike): void {
  try {
    storage?.setItem?.(TEACHER_WINBACK_DISMISS_KEY, 'true');
  } catch {
    /* private mode / quota: the in-session hide still works */
  }
}

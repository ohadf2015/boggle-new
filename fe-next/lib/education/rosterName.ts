import { resolveDisplayName } from '@/lib/displayName';

export const ROSTER_NAME_MAX = 40;

export type RosterNameParse = { ok: true; value: string | null } | { ok: false; reason: 'empty' | 'tooLong' };

/** Mirrors the DB CHECK: 1..40 characters after trimming; null clears. */
export function parseRosterName(input: string | null): RosterNameParse {
  if (input === null) return { ok: true, value: null };
  const value = input.trim();
  if (!value) return { ok: false, reason: 'empty' };
  if ([...value].length > ROSTER_NAME_MAX) return { ok: false, reason: 'tooLong' };
  return { ok: true, value };
}

type ProfileNames = { display_name?: string | null; username?: string | null } | null | undefined;

/** The name a teacher sees: their own roster name for the student, else the student's own name. */
export function teacherFacingName(rosterName: unknown, profile: ProfileNames, fallback: string): string {
  const own = typeof rosterName === 'string' ? rosterName.trim() : '';
  return own || resolveDisplayName([profile?.display_name, profile?.username], fallback);
}

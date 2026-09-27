/**
 * Pure roster helpers for the "Get students in" card and the projector sheet.
 */
import { resolveDisplayName } from '@/lib/displayName';

export interface RosterStudent {
  id: string;
  name: string;
  avatar: Record<string, unknown> | null;
}

interface RawMembership {
  id: string;
  student_id?: string;
  profiles?: unknown;
}

interface RawProfile {
  display_name?: string | null;
  username?: string | null;
  avatar_config?: Record<string, unknown> | null;
}

/** `getClassroomStudents` rows → what a seat needs. Supabase returns the profile as an array OR an object. */
export function normalizeRoster(rows: readonly RawMembership[], fallbackName: string): RosterStudent[] {
  return rows.map((row) => {
    const raw = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const profile = (raw || null) as RawProfile | null;
    return {
      id: row.student_id || row.id,
      name: resolveDisplayName([profile?.display_name, profile?.username], fallbackName),
      avatar: profile?.avatar_config ?? null,
    };
  });
}

/**
 * Who joined since the last read. `prev === null` is the first settled read:
 * nobody is new then, or every page load would light up and ding the whole
 * class (pitfall class 1 — an early render mistaken for an event).
 */
export function newArrivals(prev: readonly string[] | null, next: readonly string[]): string[] {
  if (prev === null) return [];
  const seen = new Set(prev);
  return next.filter((id) => !seen.has(id));
}

/** How a row of `seats` splits into avatars, empty ghost seats and a "+N" chip. */
export function seatPlan(count: number, seats: number): { shown: number; ghosts: number; overflow: number } {
  if (count <= seats) return { shown: count, ghosts: seats - count, overflow: 0 };
  return { shown: seats - 1, ghosts: 0, overflow: count - (seats - 1) };
}

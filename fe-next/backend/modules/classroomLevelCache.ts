/**
 * Per-(classroom, student) differentiation level, cached for a minute.
 *
 * A teacher's level change is written by the Next API, a separate module graph
 * with no hook into this process, so the TTL is what bounds staleness.
 */

import type { TeamAbilities } from '@/shared/utils/teamBattle';
import { getClassroomMembershipLevel, type ClassroomLevel } from './supabase/classroomMembership.js';

export const CLASSROOM_LEVEL_TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;

const LEVEL_ABILITY: Record<ClassroomLevel, number> = { support: 1, core: 2, challenge: 3 };

interface Entry {
  level: ClassroomLevel;
  loadedAt: number;
}

const cache = new Map<string, Entry>();

const keyOf = (classroomId: string, userId: string) => `${classroomId}:${userId}`;

export async function getClassroomLevelCached(
  userId: string,
  classroomId: string,
  now: number = Date.now()
): Promise<ClassroomLevel> {
  const key = keyOf(classroomId, userId);
  const hit = cache.get(key);
  if (hit && now - hit.loadedAt < CLASSROOM_LEVEL_TTL_MS) return hit.level;
  const level = await getClassroomMembershipLevel(userId, classroomId);
  cache.delete(key);
  cache.set(key, { level, loadedAt: now });
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  return level;
}

/** Last known level regardless of age; never touches the database. */
export function peekClassroomLevel(classroomId: string, userId: string): ClassroomLevel | undefined {
  return cache.get(keyOf(classroomId, userId))?.level;
}

export function invalidateClassroomLevel(classroomId: string, userId: string): void {
  cache.delete(keyOf(classroomId, userId));
}

export function clearClassroomLevelCache(): void {
  cache.clear();
}

/** Team-draft ratings for the students whose level this process has seen. */
export function classroomTeamAbilities(
  classroomId: string,
  students: Array<{ username: string; authUserId: string | null | undefined }>
): TeamAbilities {
  const abilities: TeamAbilities = {};
  for (const { username, authUserId } of students) {
    if (!authUserId) continue;
    const level = peekClassroomLevel(classroomId, authUserId);
    if (level) abilities[username.toLowerCase()] = LEVEL_ABILITY[level];
  }
  return abilities;
}

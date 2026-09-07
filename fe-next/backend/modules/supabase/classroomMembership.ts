/**
 * Classroom Membership Module
 *
 * Backend-only authorization helpers for classroom game access.
 * Verifies that a user is either the teacher of a classroom or an
 * enrolled student before allowing them to create/join/observe
 * classroom-scoped multiplayer games.
 *
 * SECURITY: These functions run with the service-role Supabase client,
 * so they bypass RLS. Callers MUST check the return value and refuse
 * the action on `false`.
 */

import { getSupabase } from './client';

export type ClassroomRole = 'teacher' | 'student' | null;

/**
 * Three states, because collapsing them caused a real incident: a teacher was
 * told "You are not the teacher of this classroom" — in front of her class —
 * when the SERVER had no service-role key. `no` is a fact about the user;
 * `unavailable` is a fact about us, and must never be shown as the former.
 */
export type MembershipCheck = 'yes' | 'no' | 'unavailable';

export interface ClassroomRoleResult {
  status: 'ok' | 'unavailable';
  role: ClassroomRole;
}

/**
 * Turn one PostgREST single-row result into a three-state answer.
 *
 * Takes the already-awaited result rather than building the query. Threading a
 * query builder through a helper — reassigning it across `.eq()` calls — makes
 * TypeScript walk PostgREST's generics until it gives up with TS2589. Each
 * caller writes its own literal chain; only the interpretation is shared.
 */
function interpretLookup(result: { data: unknown; error: unknown }): MembershipCheck {
  // A failed lookup is OUR problem, not evidence about this user.
  if (result.error) return 'unavailable';
  return result.data ? 'yes' : 'no';
}

/** Is `userId` the owning teacher of `classroomId`? Three-state. */
export async function resolveClassroomTeacher(
  userId: string,
  classroomId: string
): Promise<MembershipCheck> {
  const client = getSupabase();
  if (!client) return 'unavailable';

  const { data, error } = await client
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('teacher_id', userId)
    .maybeSingle();

  return interpretLookup({ data, error });
}

/** Is `userId` an enrolled student of `classroomId`? Three-state. */
export async function resolveClassroomStudent(
  userId: string,
  classroomId: string
): Promise<MembershipCheck> {
  const client = getSupabase();
  if (!client) return 'unavailable';

  const { data, error } = await client
    .from('classroom_memberships')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', userId)
    .maybeSingle();

  return interpretLookup({ data, error });
}

/**
 * The user's role, distinguishing "genuinely no relationship" from "we could
 * not find out". A caller that shows the first message for the second case is
 * accusing someone of something the server cannot actually establish.
 */
export async function resolveClassroomRole(
  userId: string,
  classroomId: string
): Promise<ClassroomRoleResult> {
  const teacher = await resolveClassroomTeacher(userId, classroomId);
  if (teacher === 'yes') return { status: 'ok', role: 'teacher' };
  if (teacher === 'unavailable') return { status: 'unavailable', role: null };

  const student = await resolveClassroomStudent(userId, classroomId);
  if (student === 'yes') return { status: 'ok', role: 'student' };
  if (student === 'unavailable') return { status: 'unavailable', role: null };

  return { status: 'ok', role: null };
}

/**
 * The classroom's display name, or null when it cannot be resolved.
 *
 * Resolved on the SERVER and put on the wire beside the game, so a student's
 * banner can say which class a game is for without a second client lookup that
 * could disagree with the game it is labelling. Cross-classroom lesson reuse is
 * the intended teacher workflow — one vocabulary list across every period — so
 * the lesson name alone cannot identify the class, and a Flow Check student
 * seeing "Week 3 Vocabulary" with no classroom named is what made a correct
 * game look like the wrong one.
 *
 * Null on every miss (no row, DB error, no client). The label is a courtesy and
 * must never gate the banner: callers fall back to the lesson alone.
 */
export async function resolveClassroomName(classroomId: string): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('classrooms')
    .select('name')
    .eq('id', classroomId)
    .maybeSingle();

  if (error || !data) return null;
  const name = (data as { name?: unknown }).name;
  return typeof name === 'string' && name.trim() ? name : null;
}

/** Mirrors `VocabularyLevel` in lib/supabase/education/types.ts (kept local: backend does not import frontend lib). */
export type ClassroomLevel = 'support' | 'core' | 'challenge';
const CLASSROOM_LEVELS: readonly ClassroomLevel[] = ['support', 'core', 'challenge'];

/**
 * The student's differentiation level in `classroomId` (classroom_memberships.level).
 *
 * Defaults to 'core' on EVERY miss — no row (teacher / guest / stranger), DB error,
 * missing client, unexpected value — because a lookup failure must never change
 * gameplay for a player who was already allowed in.
 */
export async function getClassroomMembershipLevel(
  userId: string,
  classroomId: string
): Promise<ClassroomLevel> {
  const client = getSupabase();
  if (!client) return 'core';

  const { data, error } = await client
    .from('classroom_memberships')
    .select('level')
    .eq('classroom_id', classroomId)
    .eq('student_id', userId)
    .maybeSingle();

  if (error || !data) return 'core';
  const level = (data as { level?: unknown }).level;
  return CLASSROOM_LEVELS.includes(level as ClassroomLevel) ? (level as ClassroomLevel) : 'core';
}

/**
 * Boolean form, kept for existing callers. Fails CLOSED: an unavailable lookup
 * is false, so a broken database never grants access. Callers that need to
 * TELL THE USER why should use `resolveClassroomTeacher` instead, so a server
 * fault is not reported as the user's fault.
 */
export async function isClassroomTeacher(
  userId: string,
  classroomId: string
): Promise<boolean> {
  return (await resolveClassroomTeacher(userId, classroomId)) === 'yes';
}

/** Boolean form, fails closed. See `resolveClassroomStudent` for the reason. */
export async function isClassroomStudent(
  userId: string,
  classroomId: string
): Promise<boolean> {
  return (await resolveClassroomStudent(userId, classroomId)) === 'yes';
}

/**
 * Returns the user's role in the classroom, or null if they have
 * no relationship to it. Prefer this when both roles are acceptable
 * (e.g. joining an active classroom game).
 */
export async function getClassroomRole(
  userId: string,
  classroomId: string
): Promise<ClassroomRole> {
  return (await resolveClassroomRole(userId, classroomId)).role;
}

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
 * Returns true if `userId` is the owning teacher of `classroomId`.
 * Returns false on missing supabase client, missing classroom, or mismatch.
 */
export async function isClassroomTeacher(
  userId: string,
  classroomId: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const { data, error } = await client
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('teacher_id', userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

/**
 * Returns true if `userId` is an enrolled student in `classroomId`.
 */
export async function isClassroomStudent(
  userId: string,
  classroomId: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const { data, error } = await client
    .from('classroom_memberships')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
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
  // Teacher check is cheaper (single row by primary key) — try first.
  if (await isClassroomTeacher(userId, classroomId)) return 'teacher';
  if (await isClassroomStudent(userId, classroomId)) return 'student';
  return null;
}

/**
 * Single source of truth for "does this profile get the teacher tools".
 *
 * The same three-way check (`user_role === 'teacher' || user_role === 'admin'
 * || is_admin`) was open-coded in the teacher dashboard and in
 * `useTeacherAccess`. Duplicated gates drift, and this particular gate silently
 * locked 14 approved teachers out for two months — so it lives in one place now.
 */

export interface TeacherRoleProfile {
  user_role?: string | null;
  is_admin?: boolean | null;
}

export function isTeacherProfile(profile: TeacherRoleProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.user_role === 'teacher' || profile.user_role === 'admin' || profile.is_admin === true;
}

export interface TeacherMenuEntry {
  /** Locale-relative; callers prefix the active language. */
  href: string;
  labelKey: string;
  isTeacher: boolean;
}

/**
 * Where the nav's teacher entry should point. Teachers get their classroom;
 * everyone else gets the public education landing (sending a non-teacher to
 * /teacher just bounces them home).
 */
export function teacherMenuEntry(profile: TeacherRoleProfile | null | undefined): TeacherMenuEntry {
  return isTeacherProfile(profile)
    ? { href: '/teacher', labelKey: 'education.nav.myClassroom', isTeacher: true }
    : { href: '/education', labelKey: 'education.nav.forTeachers', isTeacher: false };
}

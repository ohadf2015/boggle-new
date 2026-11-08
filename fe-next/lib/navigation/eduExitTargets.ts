/**
 * Destinations for education exits that were decided inline in components or
 * hooks. Kept pure so the route matrix can pin them.
 */
import { educationHomeFor, type EducationRole } from '@/lib/navigation/educationBackHref';
import { classroomLivePath } from '@/lib/education/classroomLivePath';

/** Quick Play opened from the student Academy goes back to the Academy, not the arcade home. */
export function quickPlayBackHref(locale: string, academy: boolean): string | undefined {
  return academy ? `/${locale}/student` : undefined;
}

/**
 * A join that resolves to a live game walks straight into the room, keeping classroom context.
 * With no live game the destination is the class view: /student?class=open opens ClassSheet
 * on the Academy hub with the student's next open assignment surfaced.
 */
export function joinSuccessHref(locale: string, gameCode: string | null | undefined): string {
  return gameCode ? classroomLivePath(locale, gameCode) : `/${locale}/student?class=open`;
}

const CLASSROOM_GAME_RE = /^\/([a-z]{2})\/education\/classroom-game\/?$/;

/**
 * Android back on classroom-game for a teacher. The landing replaces an approved
 * teacher straight back onto this page, so the URL parent would loop. Null means
 * "no override, use the URL parent".
 */
export function classroomGameAndroidBackHref(pathname: string | null | undefined, isTeacher: boolean): string | null {
  const match = CLASSROOM_GAME_RE.exec(pathname || '');
  return match && isTeacher ? educationHomeFor(match[1], 'teacher') : null;
}

interface EducationViewer {
  isTeacher: boolean;
  userRole: string | null | undefined;
  isAnonymous: boolean | null | undefined;
}

/** A guest student (anonymous account) belongs to the student hub, like a signed-in student. */
export function educationViewerRole({ isTeacher, userRole, isAnonymous }: EducationViewer): EducationRole {
  if (isTeacher) return 'teacher';
  if (userRole === 'student' || isAnonymous) return 'student';
  return null;
}

interface EducationAuthState {
  loading?: boolean;
  user: { is_anonymous?: boolean | null } | null | undefined;
  profile: unknown;
}

/** The role is known once auth settles and a signed-in viewer's profile has arrived; until then the viewer may still be a teacher. */
export function educationViewerResolved({ loading, user, profile }: EducationAuthState): boolean {
  if (loading) return false;
  return !user || !!user.is_anonymous || profile != null;
}

/** Only a signed-out visitor on a public page may leave for the game home. */
export function educationExitHref(locale: string, role: EducationRole, resolved: boolean): string | undefined {
  return role || !resolved ? undefined : `/${locale}`;
}

function isStudentJoinPath(pathname: string | null | undefined): boolean {
  return /^\/[^/]+\/student\/join(?:[/?#]|$)/.test(pathname || '');
}

/** Students sign out to the class code entry; everyone else to the education landing. */
export function educationSignOutHref(locale: string, role: EducationRole, pathname: string | null | undefined): string {
  return role === 'student' || isStudentJoinPath(pathname) ? `/${locale}/join` : `/${locale}/education`;
}

/** Solo practice inside the classroom product: no player tab bar, no ads. */
export function studentPracticeHref(locale: string, from?: 'late_join'): string {
  return `/${locale}/student/quick-play${from ? `?from=${from}` : ''}`;
}

/** A late joiner has no class hub yet, so back returns to the code entry. */
export function studentPracticeBackHref(locale: string, from: string | null): string {
  return from === 'late_join' ? `/${locale}/join` : `/${locale}/student`;
}

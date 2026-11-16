import { isStudentJoinPath } from '@/components/education/join/joinRoutes';
import { isClassroomLivePathname } from '@/lib/education/classroomLivePath';

/**
 * Pages where the floating feedback launcher stays off: the screens a student
 * plays on, and the live classroom board a teacher projects to the class.
 *
 * On a phone the launcher is a yellow chip in the bottom corner of the answer
 * area. Kids tap it mid-round, and it rides the projector in front of the whole
 * class. Teacher and player pages keep it.
 */
export function isFeedbackWidgetHiddenPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/)[0];
  if (isStudentJoinPath(path) || isClassroomLivePathname(path)) return true;
  const segments = path.split('/').filter(Boolean);
  // `/student/...` and `/<locale>/student/...`: the signed-in student app.
  return segments[0] === 'student' || segments[1] === 'student';
}

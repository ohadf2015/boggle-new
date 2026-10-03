/**
 * next-open-assignment — the student's next unfinished classroom homework.
 *
 * Class view (ClassSheet) shows one primary Play CTA for this, or nothing when
 * there is no open assignment. Lessons without an assignment (solo practice)
 * and completed homework never win.
 */
import type { StudentLesson } from '@/hooks/useStudentProgress';
import { lessonHref } from '@/components/student/academy/academyNodes';

export const STUDENT_ASSIGNMENT_CTA_TESTID = 'student_assignment_cta';

export interface NextOpenAssignment {
  assignmentId: string;
  lessonId: string;
  href: string;
  title: string;
  dueDate: string | null;
}

function assignmentIdOf(lesson: StudentLesson): string | null {
  const id = lesson.assignment?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function dueOf(lesson: StudentLesson): string | null {
  return lesson.dueDate ?? lesson.assignment?.due_date ?? null;
}

function createdOf(lesson: StudentLesson): string {
  return lesson.assignedAt ?? lesson.assignment?.created_at ?? '';
}

function classroomOf(lesson: StudentLesson): string | null {
  return lesson.classroomId ?? lesson.assignment?.classroom_id ?? null;
}

export function nextOpenAssignment(
  lessons: readonly StudentLesson[],
  locale: string,
  classroomId?: string | null,
): NextOpenAssignment | null {
  const open = lessons.filter((lesson) => {
    if (!assignmentIdOf(lesson)) return false;
    if (lesson.status === 'completed') return false;
    if (classroomId) {
      const cid = classroomOf(lesson);
      if (cid && cid !== classroomId) return false;
    }
    return true;
  });
  if (open.length === 0) return null;

  open.sort((a, b) => {
    const ad = dueOf(a);
    const bd = dueOf(b);
    if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    const ac = createdOf(a);
    const bc = createdOf(b);
    if (ac !== bc) return ac < bc ? -1 : 1;
    return 0;
  });

  const pick = open[0];
  const { href } = lessonHref(pick, locale);
  return {
    assignmentId: assignmentIdOf(pick)!,
    lessonId: pick.lessonId,
    title: pick.lesson?.name || pick.lessonId,
    dueDate: dueOf(pick),
    href,
  };
}

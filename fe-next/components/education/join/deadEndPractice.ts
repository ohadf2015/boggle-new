
export type DeadEndState = 'ended' | 'room_gone' | 'invalid_code' | 'no_room';
export type DeadEndTarget = 'class_list' | 'public_list';

export function guestPracticeHref(locale: string): string {
  return `/${locale}/join/practice`;
}

export function classPracticeHref(locale: string, lessonId: string): string {
  return `/${locale}/student/lessons/${encodeURIComponent(lessonId)}?mode=spelling`;
}

export interface ClassLessonLike {
  id: string;
  name: string;
  classroom_id: string | null;
  words: ReadonlyArray<unknown> | null;
  created_at?: string | null;
  assignment: { classroom_id?: string | null; created_at?: string | null } | null;
}

function isNewer(a: ClassLessonLike, b: ClassLessonLike): boolean {
  const byAssignment = (a.assignment?.created_at ?? '').localeCompare(b.assignment?.created_at ?? '');
  if (byAssignment !== 0) return byAssignment > 0;
  return (a.created_at ?? '') > (b.created_at ?? '');
}

export function pickLatestClassLesson<T extends ClassLessonLike>(lessons: readonly T[], classroomId: string | null): T | null {
  if (!classroomId) return null;
  const usable = lessons.filter(
    (l) => (l.classroom_id === classroomId || l.assignment?.classroom_id === classroomId) && (l.words?.length ?? 0) > 0,
  );
  let best: T | null = null;
  for (const l of usable) {
    if (!best) best = l;
    else if (isNewer(l, best)) best = l;
  }
  return best;
}

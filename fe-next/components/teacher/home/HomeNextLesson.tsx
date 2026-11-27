'use client';

import { LessonPlanPrompt } from '@/components/education/LessonPlanPrompt';

/**
 * A class with no students yet gets the ask ("when is your next lesson?"). A class with students shows only a
 * class that is already booked, with its calendar invite and join link, so the planned lesson stays on the home card.
 * The no-students card sits right under the hero, so it holds its height while the plan loads and the desk under it
 * does not jump; the booked-only card sits at the bottom and renders nothing until there is something to show.
 */
export function HomeNextLesson({ classroomId, memberCount }: { classroomId: string; memberCount: number | undefined }) {
  if (memberCount === undefined) return null;
  return (
    <LessonPlanPrompt
      key={classroomId}
      classroomId={classroomId}
      source="teacher_home"
      bookedOnly={memberCount > 0}
      reserveSpace={memberCount === 0}
    />
  );
}

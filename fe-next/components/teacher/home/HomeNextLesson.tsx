'use client';

import { LessonPlanPrompt } from '@/components/education/LessonPlanPrompt';

export function HomeNextLesson({ classroomId, memberCount }: { classroomId: string; memberCount: number | undefined }) {
  if (memberCount !== 0) return null;
  return <LessonPlanPrompt key={classroomId} classroomId={classroomId} source="teacher_home" reserveSpace />;
}

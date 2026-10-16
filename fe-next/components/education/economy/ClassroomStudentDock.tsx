'use client';

import { useEffect, useState } from 'react';
import { isClassroomStudentPlay } from '@/lib/education/classroomPlaySurface';
import ClassroomEconomyDock from './ClassroomEconomyDock';

/**
 * The class economy strip for a student in a classroom round, any board mode.
 * Resolved after mount (URL), so the first render matches the server.
 */
export default function ClassroomStudentDock({ gameCode }: { gameCode: string | null | undefined }) {
  const [student, setStudent] = useState(false);
  useEffect(() => {
    setStudent(isClassroomStudentPlay(new URLSearchParams(window.location.search)));
  }, []);
  return student && gameCode ? <ClassroomEconomyDock gameCode={gameCode} /> : null;
}

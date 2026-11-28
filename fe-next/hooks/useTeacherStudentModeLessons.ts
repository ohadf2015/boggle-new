'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClassroomAssignments } from '@/lib/supabase/education';
import type { TeacherAssignment } from '@/lib/supabase/education/types';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import { readTeacherStudentMode } from '@/lib/education/teacherStudentMode';
import { assignmentsToStudentLessons } from '@/lib/education/teacherStudentView';
import type { StudentLesson } from '@/hooks/useStudentProgress';

export function useTeacherStudentModeLessons(): {
  active: boolean;
  pending: boolean;
  lessons: StudentLesson[] | null;
  error: boolean;
  retry: () => void;
} {
  const { loading, user, profile } = useAuth();
  // undefined = not decided yet (flag unread, or a flag waiting on the profile)
  const [classroomId, setClassroomId] = useState<string | null | undefined>(undefined);
  const [assignments, setAssignments] = useState<TeacherAssignment[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const flagged = readTeacherStudentMode()?.classroomId ?? null;
    if (!flagged || (!loading && !user)) return setClassroomId(null);
    if (profile) setClassroomId(isTeacherProfile(profile) ? flagged : null);
  }, [loading, user, profile]);

  useEffect(() => {
    if (!classroomId) return;
    let cancelled = false;
    void getClassroomAssignments(classroomId).then(({ data, error: readError }) => {
      if (cancelled) return;
      setError(!!readError);
      setAssignments(readError ? null : data);
    });
    return () => {
      cancelled = true;
    };
  }, [classroomId, attempt]);

  const retry = useCallback(() => {
    setError(false);
    setAttempt((n) => n + 1);
  }, []);

  const lessons = useMemo(
    () => (classroomId && assignments ? assignmentsToStudentLessons(assignments, classroomId) : null),
    [assignments, classroomId],
  );
  const active = !!classroomId;
  return { active, pending: classroomId === undefined || (active && !lessons && !error), lessons, error, retry };
}

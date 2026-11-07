'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { usePracticeLessons } from '@/hooks/usePracticeLessons';
import { classPracticeHref, guestPracticeHref, pickLatestClassLesson, type DeadEndTarget } from './deadEndPractice';

const LOOKUP_GIVE_UP_MS = 2500;

export interface DeadEndPractice {
  /** Null while the class lookup is still out, so the button never points one place and then another. */
  href: string | null;
  target: DeadEndTarget;
  lessonName: string | null;
}

export function useDeadEndPractice(enrolledClassroomId?: string | null): DeadEndPractice {
  const { language } = useLanguage();
  const { classroomId: ownClassroomId, isLoading: classroomLoading } = useStudentClassroom();
  const { lessons, isLoading: lessonsLoading } = usePracticeLessons();
  const [gaveUp, setGaveUp] = useState(false);

  const classroomId = enrolledClassroomId || (classroomLoading ? null : ownClassroomId);
  const pending = !gaveUp && (lessonsLoading || (!enrolledClassroomId && classroomLoading));

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setGaveUp(true), LOOKUP_GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  const [settled, setSettled] = useState<DeadEndPractice | null>(null);
  const current = useMemo<DeadEndPractice>(() => {
    if (pending) return { href: null, target: 'public_list', lessonName: null };
    const lesson = lessonsLoading ? null : pickLatestClassLesson(lessons, classroomId);
    return lesson
      ? { href: classPracticeHref(language, lesson.id), target: 'class_list', lessonName: lesson.name }
      : { href: guestPracticeHref(language), target: 'public_list', lessonName: null };
  }, [pending, lessonsLoading, lessons, classroomId, language]);

  useEffect(() => {
    if (!current.href) return;
    if (!settled || (settled.target === 'public_list' && current.target === 'class_list')) setSettled(current);
  }, [settled, current]);

  return settled ?? current;
}

'use client';

/**
 * Post-join Play CTA: the class's next open assignment, or a door to the
 * Academy when the teacher has not assigned anything yet.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { nextOpenAssignment } from '@/components/student/nextOpenAssignment';
import { StudentAssignmentPlayCta } from '@/components/student/StudentAssignmentPlayCta';

const K = 'education.student.join';

export function JoinNextAssignmentCta({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const { lessons, isLoading } = useStudentProgress();
  const next = useMemo(
    () => nextOpenAssignment(lessons, language, classroomId),
    [lessons, language, classroomId],
  );

  if (isLoading) {
    return (
      <p role="status" className="text-center font-neo-body text-sm font-bold text-neo-lime">
        {t(`${K}.flow.findingAssignment`)}
      </p>
    );
  }

  if (next) {
    return <StudentAssignmentPlayCta next={next} />;
  }

  return (
    <Link
      href={`/${language}/student`}
      data-testid="join-open-academy"
      className="flex min-h-[48px] w-full items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cyan px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard-sm"
    >
      {t(`${K}.flow.openAcademy`)}
    </Link>
  );
}

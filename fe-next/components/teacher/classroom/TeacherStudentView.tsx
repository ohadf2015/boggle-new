'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, RotateCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { PageLoader } from '@/components/ui/PageLoader';
import { AcademyHubView } from '@/components/student/academy/AcademyHubView';
import { useClassrooms } from '@/hooks/useClassroom';
import { useAssignments } from '@/hooks/useAssignments';
import { assignmentsToStudentLessons } from '@/lib/education/teacherStudentView';
import type { StudentLesson } from '@/hooks/useStudentProgress';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL } from '@/components/teacher/nb/nbStyles';

const noop = () => undefined;

/** The class's real student home (map, lessons, practice games) as a brand-new student of that class sees it. */
export function TeacherStudentView({ classroomId }: { classroomId: string }) {
  return (
    <TeacherGate>
      <StudentView classroomId={classroomId} />
    </TeacherGate>
  );
}

function StudentView({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { classrooms, isLoading: classesLoading } = useClassrooms();
  const classroom = classrooms.find((c) => c.id === classroomId);
  const { assignments, isLoading, error, refresh } = useAssignments(classroomId);
  const lessons = useMemo(() => assignmentsToStudentLessons(assignments, classroomId), [assignments, classroomId]);

  if ((classesLoading && !classroom) || (isLoading && assignments.length === 0)) return <PageLoader nested />;

  return (
    <StudentViewFrame
      userId={user?.id ?? 'teacher-preview'}
      classroomId={classroomId}
      classroomName={classroom?.name ?? null}
      lessons={lessons}
      backHref={`/${language}/teacher/classroom/${classroomId}`}
      error={!!error}
      onRetry={() => void refresh()}
      t={t}
    />
  );
}

export interface StudentViewFrameProps {
  userId: string;
  classroomId: string;
  classroomName: string | null;
  lessons: StudentLesson[];
  backHref: string;
  error: boolean;
  onRetry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function StudentViewFrame({ userId, classroomId, classroomName, lessons, backHref, error, onRetry, t }: StudentViewFrameProps) {
  return (
    <div data-testid="teacher-student-view" className="flex min-h-dvh flex-col bg-edu-page [--academy-hub-top:3.25rem]">
      <div className="fixed inset-x-0 top-0 z-[60] flex h-[3.25rem] items-center gap-2 border-b-[3px] border-neo-black bg-neo-yellow px-3 text-neo-black">
        <Eye className="size-5 shrink-0" strokeWidth={2.75} aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate font-neo-display text-sm font-black sm:text-base">
          {t('teacher.studentView.banner', { name: classroomName ?? '' })}
        </p>
        <Link href={backHref} data-testid="student-view-back" className={cn(NB_SMALL, NB_BLOCK.cream)}>
          <DirectionalIcon icon={ArrowLeft} className="size-4" />
          {t('teacher.studentView.back')}
        </Link>
      </div>
      {error ? (
        <div role="alert" className="m-4 mt-[4.25rem] flex flex-col items-center gap-3 rounded-neo-lg border-[3px] border-neo-black bg-edu-surface p-6 text-center text-edu-ink">
          <p className="font-neo-display text-lg font-black">{t('teacher.studentView.error')}</p>
          <button type="button" data-testid="student-view-retry" onClick={onRetry} className={cn(NB_SMALL, NB_BLOCK.lime)}>
            <RotateCw className="size-4" aria-hidden="true" />
            {t('teacher.studentView.retry')}
          </button>
        </div>
      ) : (
        <AcademyHubView
          userId={userId}
          studentName={t('teacher.studentView.studentName')}
          classroomId={classroomId}
          classroomName={classroomName}
          level="core"
          avatarConfig={null}
          profileXp={0}
          isGuest={false}
          onSignOut={noop}
          data={{
            lessons,
            lessonsLoading: false,
            reviewLessonId: lessons[0]?.lessonId ?? '',
            reviewCount: 0,
            streak: 0,
            streakAtRisk: false,
            streakDoneToday: false,
            stars: 0,
          }}
          liveGame={null}
          join={noop}
          isJoining={false}
          joinError={null}
          reward={null}
          clearReward={noop}
        />
      )}
    </div>
  );
}

export default TeacherStudentView;

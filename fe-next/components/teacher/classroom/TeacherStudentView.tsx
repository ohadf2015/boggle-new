'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { PageLoader } from '@/components/ui/PageLoader';
import { AcademyHubView } from '@/components/student/academy/AcademyHubView';
import { prepareRehearsal } from '@/components/teacher/home/RehearseWithBotsButton';
import { useClassrooms } from '@/hooks/useClassroom';
import { useAssignments } from '@/hooks/useAssignments';
import { assignmentsToStudentLessons } from '@/lib/education/teacherStudentView';
import { startTeacherStudentMode } from '@/lib/education/teacherStudentMode';
import type { StudentLesson } from '@/hooks/useStudentProgress';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL } from '@/components/teacher/nb/nbStyles';

const noop = () => undefined;

/** The class page's "see the student app" link: turns student mode on for this class, then opens the real student app. */
export function TeacherStudentView({ classroomId }: { classroomId: string }) {
  return (
    <TeacherGate>
      <EnterStudentMode classroomId={classroomId} />
    </TeacherGate>
  );
}

function EnterStudentMode({ classroomId }: { classroomId: string }) {
  const { language } = useLanguage();
  const router = useRouter();
  useEffect(() => {
    startTeacherStudentMode(classroomId);
    router.replace(`/${language}/student`);
  }, [classroomId, language, router]);
  return <PageLoader nested />;
}

/** The student hub for a teacher in student mode: the class's lessons as a brand-new student of that class gets them. */
export function StudentView({ classroomId, onMissing }: { classroomId: string; onMissing: () => void }) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { classrooms, isLoading: classesLoading, error: classesError, refresh: refreshClasses } = useClassrooms();
  const classroom = classrooms.find((c) => c.id === classroomId);
  const missing = !classesLoading && !classesError && !classroom;
  const { assignments, isLoading, error, refresh } = useAssignments(classroomId);
  const lessons = useMemo(() => assignmentsToStudentLessons(assignments, classroomId), [assignments, classroomId]);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (missing) onMissing();
  }, [missing, onMissing]);

  if ((!classroom && !classesError) || (isLoading && assignments.length === 0)) return <PageLoader nested />;

  const join = async () => {
    if (isJoining) return;
    setIsJoining(true);
    router.push(await prepareRehearsal({ userId: user?.id, classroomId, source: 'class', language, t, withSeat: true }));
  };

  return (
    <StudentViewFrame
      userId={user?.id ?? 'teacher-preview'}
      classroomId={classroomId}
      classroomName={classroom?.name ?? null}
      teacherName={(profile as { display_name?: string | null } | null)?.display_name ?? ''}
      lessons={lessons}
      error={!!error || !!classesError}
      onRetry={() => void Promise.all([refresh(), refreshClasses()])}
      onJoin={() => void join()}
      isJoining={isJoining}
      t={t}
    />
  );
}

export interface StudentViewFrameProps {
  userId: string;
  classroomId: string;
  classroomName: string | null;
  teacherName: string;
  lessons: StudentLesson[];
  error: boolean;
  onRetry: () => void;
  /** The live-game island: a practice run with bots, the teacher in a student seat. */
  onJoin: () => void;
  isJoining: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function StudentViewFrame({ userId, classroomId, classroomName, teacherName, lessons, error, onRetry, onJoin, isJoining, t }: StudentViewFrameProps) {
  if (error) {
    return (
      <div role="alert" className="m-4 flex flex-col items-center gap-3 rounded-neo-lg border-[3px] border-neo-black bg-edu-surface p-6 text-center text-edu-ink">
        <p className="font-neo-display text-lg font-black">{t('teacher.studentView.error')}</p>
        <button type="button" data-testid="student-view-retry" onClick={onRetry} className={cn(NB_SMALL, NB_BLOCK.lime)}>
          <RotateCw className="size-4" aria-hidden="true" />
          {t('teacher.studentView.retry')}
        </button>
      </div>
    );
  }
  return (
    <div data-testid="teacher-student-view" className="contents">
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
        liveGame={{ gameCode: 'rehearsal', teacherName, lessonNames: [], classroomId, classroomName, rehearsal: true }}
        join={onJoin}
        isJoining={isJoining}
        joinError={null}
        reward={null}
        clearReward={noop}
      />
    </div>
  );
}

export default TeacherStudentView;

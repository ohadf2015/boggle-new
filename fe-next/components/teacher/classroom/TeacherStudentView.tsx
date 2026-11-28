'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { PageLoader } from '@/components/ui/PageLoader';
import { AcademyHubView } from '@/components/student/academy/AcademyHubView';
import { useClassrooms } from '@/hooks/useClassroom';
import { useAssignments } from '@/hooks/useAssignments';
import { useStudentProgress, type StudentLesson } from '@/hooks/useStudentProgress';
import { useWinStreak } from '@/hooks/useWinStreak';
import { ReviewCountBridge } from '@/components/student/academy/ReviewCountBridge';
import { totalStars } from '@/components/student/academy/academyNodes';
import { assignmentsToStudentLessons, withOwnProgress } from '@/lib/education/teacherStudentView';
import { startTeacherStudentMode } from '@/lib/education/teacherStudentMode';
import { StudentModeError } from './StudentModeError';

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

const firstReviewLessonId = (lessons: readonly StudentLesson[]) => lessons.find((l) => l.lesson?.words?.length)?.lessonId ?? '';

/** The student hub for a teacher in student mode: the class's lessons with the teacher's own progress, XP and streak. */
export function StudentView({ classroomId, onMissing }: { classroomId: string; onMissing: () => void }) {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { classrooms, isLoading: classesLoading, error: classesError, refresh: refreshClasses } = useClassrooms();
  const classroom = classrooms.find((c) => c.id === classroomId);
  const missing = !classesLoading && !classesError && !classroom;
  const { assignments, isLoading, error, refresh } = useAssignments(classroomId);
  const { progress, isLoading: progressLoading } = useStudentProgress();
  const lessons = useMemo(
    () => withOwnProgress(assignmentsToStudentLessons(assignments, classroomId), progress),
    [assignments, classroomId, progress],
  );
  const { currentStreak, isStreakAtRisk, lastWinDate } = useWinStreak();
  const reviewLessonId = firstReviewLessonId(lessons);
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (missing) onMissing();
  }, [missing, onMissing]);

  if ((!classroom && !classesError) || (isLoading && assignments.length === 0)) return <PageLoader nested />;

  return (
    <>
      {reviewLessonId && <ReviewCountBridge key={reviewLessonId} lessonId={reviewLessonId} onCount={setReviewCount} />}
      <StudentViewFrame
        userId={user?.id ?? 'teacher-preview'}
        classroomId={classroomId}
        classroomName={classroom?.name ?? null}
        lessons={lessons}
        profileXp={Number((profile as { total_xp?: number | null } | null)?.total_xp) || 0}
        stats={{
          lessonsLoading: progressLoading,
          reviewCount: reviewCount ?? 0,
          reviewPending: progressLoading || (!!reviewLessonId && reviewCount === null),
          streak: currentStreak,
          streakAtRisk: isStreakAtRisk,
          streakDoneToday: !!lastWinDate && new Date(lastWinDate).toDateString() === new Date().toDateString(),
        }}
        error={!!error || !!classesError}
        onRetry={() => void Promise.all([refresh(), refreshClasses()])}
        t={t}
      />
    </>
  );
}

export interface StudentModeStats {
  lessonsLoading: boolean;
  reviewCount: number;
  reviewPending: boolean;
  streak: number;
  streakAtRisk: boolean;
  streakDoneToday: boolean;
}

const FRESH: StudentModeStats = { lessonsLoading: false, reviewCount: 0, reviewPending: false, streak: 0, streakAtRisk: false, streakDoneToday: false };

export interface StudentViewFrameProps {
  userId: string;
  classroomId: string;
  classroomName: string | null;
  lessons: StudentLesson[];
  profileXp?: number;
  stats?: StudentModeStats;
  error: boolean;
  onRetry: () => void;
  /** The live-game island: a practice run with bots, the teacher in a student seat. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function StudentViewFrame({ userId, classroomId, classroomName, lessons, profileXp = 0, stats = FRESH, error, onRetry, t }: StudentViewFrameProps) {
  if (error) return <StudentModeError onRetry={onRetry} />;
  return (
    <div data-testid="teacher-student-view" className="contents">
      <AcademyHubView
        userId={userId}
        studentName={t('teacher.studentView.studentName')}
        classroomId={classroomId}
        classroomName={classroomName}
        level="core"
        avatarConfig={null}
        profileXp={profileXp}
        isGuest={false}
        onSignOut={noop}
        data={{ ...stats, lessons, reviewLessonId: firstReviewLessonId(lessons), stars: totalStars(lessons, 'core') }}
        liveGame={null}
        join={noop}
        isJoining={false}
        joinError={null}
        reward={null}
        clearReward={noop}
      />
    </div>
  );
}

export default TeacherStudentView;

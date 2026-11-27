/** The Classes tab: a thin shell around ClassroomManager, which fetches and owns the class cards. */

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';
import { HIDE_ON_SKY } from '@/components/education/shell/ArcadeBackdrop';
import { cn } from '@/lib/utils';
import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import ClassroomManager from '@/components/teacher/ClassroomManager';
import { TEACHER_TV_SCALE } from '@/components/teacher/hq/tvScale';
import { CLASSES_CONTENT_CLASS } from '@/components/teacher/routeLoading/routeShellClasses';
import { ClassesSkeleton } from '@/components/teacher/routeLoading/TeacherSkeletons';

/** The shell wraps the gate, not the other way round — see curriculum's PageClient
 *  for why: the gate's own loading/denial states need the lock too. */
function ClassesMain() {
  const revealRef = useTeacherReveal<HTMLElement>();
  return (
    <main ref={revealRef} className="relative mx-auto max-w-6xl">
      <ClassroomManager heading={<ClassesTitle />} />
    </main>
  );
}

export default function TeacherClassroomsPage() {
  return (
    <ClassesShell>
      <TeacherGate loadingFallback={<ClassesSkeleton />}>
        <ClassesMain />
      </TeacherGate>
    </ClassesShell>
  );
}

function ClassesTitle() {
  const { t } = useLanguage();
  return (
    <h1 data-wipe className="min-w-0 whitespace-nowrap font-neo-display text-3xl font-black leading-tight tracking-tight text-edu-ink sm:text-5xl [@media(orientation:landscape)_and_(max-height:500px)]:text-xl">
      {t('academy.teacher.classesTitle', 'Your classes')}
    </h1>
  );
}

/** Dark-only surface (pitfall class 5); the shell paints the arcade backdrop. */
function ClassesShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      className={TEACHER_TV_SCALE}
      scrollRegionLabel={t('teacher.nav.classes')}
      contentClassName={cn(CLASSES_CONTENT_CLASS, 'relative isolate')}
    >
      <AmbientBackdrop theme="teacher" density="calm" className={HIDE_ON_SKY} />
      {children}
    </EducationShell>
  );
}

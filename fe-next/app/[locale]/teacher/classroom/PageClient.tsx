/** The Classes tab: a thin shell around ClassroomManager, which fetches and owns the class cards. */

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import ClassroomManager from '@/components/teacher/ClassroomManager';
import { TEACHER_TV_SCALE } from '@/components/teacher/hq/tvScale';

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
      <TeacherGate>
        <ClassesMain />
      </TeacherGate>
    </ClassesShell>
  );
}

function ClassesTitle() {
  const { t } = useLanguage();
  return (
    <h1 data-wipe className="min-w-0 whitespace-nowrap font-neo-display text-2xl font-bold leading-tight tracking-tight text-neo-cream sm:text-3xl [@media(orientation:landscape)_and_(max-height:500px)]:text-xl">
      {t('academy.teacher.classesTitle', 'Your classes')}
    </h1>
  );
}

/** Calm canvas, same recipe as Teacher HQ: flat navy with a whisper of light
 *  from the top — no full-bleed illustration behind a working deck. Dark-only
 *  surface (pitfall class 5). */
function ClassesShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      className={TEACHER_TV_SCALE}
      scrollRegionLabel={t('teacher.nav.classes')}
      contentClassName="relative p-4 sm:p-6 lg:px-8 lg:py-5 [@media(orientation:landscape)_and_(max-height:500px)]:px-3 [@media(orientation:landscape)_and_(max-height:500px)]:py-2"
    >
      <div
        data-testid="calm-canvas-tint"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(255,254,240,0.05),transparent_60%)]"
        aria-hidden="true"
      />
      {children}
    </EducationShell>
  );
}

/**
 * Teacher Classes PageClient
 *
 * The nav shell's "Classes" tab (components/education/shell/navItems.ts)
 * links here. Before this route existed, the only place to create, rename or
 * delete a class was buried inside the dashboard's "teacher-tools" section —
 * exactly the surface the addendum's nav spec wants promoted to its own tab.
 *
 * `ClassroomManager` already owns the whole surface (create/edit/delete,
 * rosters, share/invite) and fetches its own data via `useClassrooms()`, so
 * this file stays a thin shell wrapper — the same shape as
 * `teacher/curriculum/PageClient.tsx` and `teacher/reports/PageClient.tsx`.
 */

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { EducationHeader } from '@/components/education/EducationHeader';
import ClassroomManager from '@/components/teacher/ClassroomManager';
import { TEACHER_TV_SCALE } from '@/components/teacher/hq/tvScale';

/** The shell wraps the gate, not the other way round — see curriculum's PageClient
 *  for why: the gate's own loading/denial states need the lock too. */
export default function TeacherClassroomsPage() {
  return (
    <ClassesShell>
      <TeacherGate>
        <main className="relative mx-auto max-w-6xl">
          <ClassroomManager richCards heading={<ClassesTitle />} />
        </main>
      </TeacherGate>
    </ClassesShell>
  );
}

function ClassesTitle() {
  const { t } = useLanguage();
  return (
    <h1 className="min-w-0 truncate font-neo-display text-lg font-bold leading-none tracking-tight text-neo-cream min-[400px]:text-xl sm:text-3xl [@media(orientation:landscape)_and_(max-height:500px)]:text-xl">
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
      header={<EducationHeader showBackButton />}
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

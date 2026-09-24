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

import Image from 'next/image';
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
    <h1 className="min-w-0 truncate font-neo-display text-lg font-black uppercase leading-none tracking-tight text-neo-white [text-shadow:3px_3px_0_#000] min-[400px]:text-xl sm:text-4xl [@media(orientation:landscape)_and_(max-height:500px)]:text-xl">
      {t('academy.teacher.classesTitle', 'Your classes')}
    </h1>
  );
}

/** Same observatory art as Teacher HQ, so Classes reads as a room of the same
 *  building, not a bare admin page. Dark-only surface (pitfall class 5). */
function ClassesShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      className={TEACHER_TV_SCALE}
      header={<EducationHeader showBackButton />}
      scrollRegionLabel={t('teacher.nav.classes')}
      contentClassName="relative p-4 sm:p-6 lg:px-8 lg:py-5 [@media(orientation:landscape)_and_(max-height:500px)]:px-3 [@media(orientation:landscape)_and_(max-height:500px)]:py-2"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/images/education/teacher-hq-bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="select-none object-cover"
        />
        <div className="absolute inset-0 bg-neo-navy/70" />
      </div>
      {children}
    </EducationShell>
  );
}

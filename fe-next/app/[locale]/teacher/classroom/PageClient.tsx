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

/** The shell wraps the gate, not the other way round — see curriculum's PageClient
 *  for why: the gate's own loading/denial states need the lock too. */
export default function TeacherClassroomsPage() {
  return (
    <ClassesShell>
      <TeacherGate>
        <main className="max-w-6xl mx-auto">
          <ClassroomManager />
        </main>
      </TeacherGate>
    </ClassesShell>
  );
}

function ClassesShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      header={<EducationHeader showBackButton />}
      scrollRegionLabel={t('teacher.nav.classes')}
      contentClassName="p-4 sm:p-6 lg:p-8"
    >
      {children}
    </EducationShell>
  );
}

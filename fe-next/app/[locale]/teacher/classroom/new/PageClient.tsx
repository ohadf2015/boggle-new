'use client';

import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import { ClassSetupInvite } from '@/components/education/ClassSetupInvite';
import { ClassSetupCreate } from '@/components/teacher/setup/ClassSetupCreate';

/** The shell wraps the gate so the gate's loading/denial states keep the body lock too. */
export default function NewClassPageClient() {
  const { t } = useLanguage();
  return (
    <EducationShell scrollRegionLabel={t('eduShell.setup.title')}>
      <TeacherGate>
        <SetupMain />
      </TeacherGate>
    </EducationShell>
  );
}

function SetupMain() {
  const revealRef = useTeacherReveal<HTMLElement>();
  const searchParams = useSearchParams();
  const classroomId = searchParams?.get('classroomId');
  return (
    <main ref={revealRef}>
      {classroomId ? <ClassSetupInvite classroomId={classroomId} packKey={searchParams?.get('pack')} /> : <ClassSetupCreate />}
    </main>
  );
}

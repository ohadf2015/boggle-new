'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import { ClassSetupFlow } from '@/components/teacher/setup/ClassSetupFlow';

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
  return (
    <main ref={revealRef}>
      <ClassSetupFlow />
    </main>
  );
}

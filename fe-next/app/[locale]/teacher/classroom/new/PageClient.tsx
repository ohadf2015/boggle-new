'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ClassSetupFlow } from '@/components/teacher/setup/ClassSetupFlow';

/** The shell wraps the gate so the gate's loading/denial states keep the body lock too. */
export default function NewClassPageClient() {
  const { t } = useLanguage();
  return (
    <EducationShell scrollRegionLabel={t('eduShell.setup.title')}>
      <TeacherGate>
        <main>
          <ClassSetupFlow />
        </main>
      </TeacherGate>
    </EducationShell>
  );
}

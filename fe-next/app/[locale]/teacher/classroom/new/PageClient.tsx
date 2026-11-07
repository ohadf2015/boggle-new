'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import { ClassSetupInvite } from '@/components/education/ClassSetupInvite';
import { ClassSetupCreate } from '@/components/teacher/setup/ClassSetupCreate';

const ClassReadyPreview = process.env.NODE_ENV !== 'production' ? dynamic(() => import('./ClassReadyPreview'), { ssr: false }) : null;

/** The shell wraps the gate so the gate's loading/denial states keep the body lock too. */
export default function NewClassPageClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  if (ClassReadyPreview && searchParams?.get('preview') === 'ready') return <ClassReadyPreview />;
  return (
    <EducationShell scrollRegionLabel={t('eduShell.setup.title')} tabs={!searchParams?.get('classroomId')}>
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
      {classroomId ? <ClassSetupInvite classroomId={classroomId} packKey={searchParams?.get('pack')} lessonId={searchParams?.get('lessonId')} /> : <ClassSetupCreate />}
    </main>
  );
}

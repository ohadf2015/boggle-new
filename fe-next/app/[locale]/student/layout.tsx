import type { ReactNode } from 'react';
import { EduSkyScope } from '@/components/education/EduSkyScope';
import { EDU_SKY_VIEWPORT } from '@/lib/education/eduSkyViewport';
import { TeacherStudentModeLayer } from '@/components/teacher/classroom/TeacherStudentModeLayer';

export const viewport = EDU_SKY_VIEWPORT;

export default function EduSkyLayout({ children }: { children: ReactNode }) {
  return (
    <EduSkyScope>
      <TeacherStudentModeLayer>{children}</TeacherStudentModeLayer>
    </EduSkyScope>
  );
}

import { ReactNode } from 'react';
import { CheckoutReturnCapture } from '@/components/teacher/CheckoutReturnCapture';
import { TeacherEducationShell } from '@/components/teacher/TeacherEducationShell';
import { EduSkyScope } from '@/components/education/EduSkyScope';
import { EDU_SKY_VIEWPORT } from '@/lib/education/eduSkyViewport';

export const viewport = EDU_SKY_VIEWPORT;

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <TeacherEducationShell>
      <EduSkyScope>
        <CheckoutReturnCapture />
        {children}
      </EduSkyScope>
    </TeacherEducationShell>
  );
}

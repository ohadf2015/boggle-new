import { ReactNode } from 'react';
import { TeacherEducationShell } from '@/components/teacher/TeacherEducationShell';

/** Wraps /[locale]/education/* with the same presence ping as /teacher. */
export default function EducationLayout({ children }: { children: ReactNode }) {
  return <TeacherEducationShell>{children}</TeacherEducationShell>;
}

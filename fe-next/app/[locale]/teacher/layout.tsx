import { ReactNode } from 'react';
import { CheckoutReturnCapture } from '@/components/teacher/CheckoutReturnCapture';
import { TeacherEducationShell } from '@/components/teacher/TeacherEducationShell';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <TeacherEducationShell>
      <CheckoutReturnCapture />
      {children}
    </TeacherEducationShell>
  );
}

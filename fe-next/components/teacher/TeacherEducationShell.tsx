import { ReactNode } from 'react';
import { TeacherPresencePing } from '@/components/teacher/TeacherPresencePing';

/**
 * Shared body for the /[locale]/teacher and /[locale]/education/* layouts.
 * Presence ping only — no extra UI. Route-specific chrome (checkout return)
 * stays in the teacher layout.
 */
export function TeacherEducationShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TeacherPresencePing />
      {children}
    </>
  );
}

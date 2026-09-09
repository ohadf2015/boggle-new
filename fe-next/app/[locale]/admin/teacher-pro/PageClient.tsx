'use client';
import { TeacherProGrantPanel } from '@/components/admin/TeacherProGrantPanel';
import AdminPageShell from '@/components/admin/AdminPageShell';

export function PageClient() {
  return (
    <AdminPageShell>
      <TeacherProGrantPanel />
    </AdminPageShell>
  );
}

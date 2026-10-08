'use client';
import { TeacherAccessQueue } from '@/components/admin/TeacherAccessQueue';
import { TeacherFunnelPanel } from '@/components/admin/TeacherFunnelPanel';
import AdminPageShell from '@/components/admin/AdminPageShell';

export function PageClient() {
  return (
    <AdminPageShell>
      <TeacherFunnelPanel />
      <TeacherAccessQueue />
    </AdminPageShell>
  );
}

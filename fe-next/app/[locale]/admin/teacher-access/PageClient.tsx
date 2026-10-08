'use client';
import { TeacherAccessQueue } from '@/components/admin/TeacherAccessQueue';
import { TeacherFunnelPanel } from '@/components/admin/TeacherFunnelPanel';
import { EduDashboardPanel } from '@/components/admin/EduDashboardPanel';
import AdminPageShell from '@/components/admin/AdminPageShell';

export function PageClient() {
  return (
    <AdminPageShell>
      <EduDashboardPanel />
      <TeacherFunnelPanel />
      <TeacherAccessQueue />
    </AdminPageShell>
  );
}

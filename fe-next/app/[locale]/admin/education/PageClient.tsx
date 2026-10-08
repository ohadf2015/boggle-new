'use client';
import { EduDashboardPanel } from '@/components/admin/EduDashboardPanel';
import AdminPageShell from '@/components/admin/AdminPageShell';

export function PageClient() {
  return (
    <AdminPageShell>
      <EduDashboardPanel />
    </AdminPageShell>
  );
}

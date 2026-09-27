'use client';
import { TeacherAccessQueue } from '@/components/admin/TeacherAccessQueue';
import { TeacherFunnelPanel } from '@/components/admin/TeacherFunnelPanel';
import AdminPageShell from '@/components/admin/AdminPageShell';

export function PageClient() {
  return (
    <AdminPageShell>
      {/* Funnel first: what happened to the people already approved is more
          urgent than the next approval decision. */}
      <TeacherFunnelPanel />
      <TeacherAccessQueue />
    </AdminPageShell>
  );
}

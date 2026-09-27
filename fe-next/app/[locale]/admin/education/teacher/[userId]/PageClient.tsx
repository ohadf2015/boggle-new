'use client';

import AdminPageShell from '@/components/admin/AdminPageShell';
import { AdminTeacherDetail } from '@/components/admin/education/AdminTeacherDetail';

export function PageClient({ userId }: { userId: string }) {
  return (
    <AdminPageShell>
      <AdminTeacherDetail userId={userId} />
    </AdminPageShell>
  );
}

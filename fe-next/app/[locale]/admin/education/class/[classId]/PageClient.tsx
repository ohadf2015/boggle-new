'use client';

import AdminPageShell from '@/components/admin/AdminPageShell';
import { AdminClassDetail } from '@/components/admin/education/AdminClassDetail';

export function PageClient({ classId }: { classId: string }) {
  return (
    <AdminPageShell>
      <AdminClassDetail classId={classId} />
    </AdminPageShell>
  );
}

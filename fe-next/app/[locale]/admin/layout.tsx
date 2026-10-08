import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isAdminSession } from '@/lib/auth/isAdminSession';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Server-side gate for every admin page. The client guard (AdminPageShell) only hides
// the UI; this stops the RSC payload and data reads from being served to non-admins.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminSession())) notFound();
  return children;
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/auth/isAdminSession';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Server-side gate for every admin page. The client guard (AdminPageShell) only hides
// the UI; this stops the RSC payload and data reads from being served to non-admins.
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  if (!(await isAdminSession())) {
    const { locale } = await params;
    redirect(`/${locale}`);
  }
  return children;
}

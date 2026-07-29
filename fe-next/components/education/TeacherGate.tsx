'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';

export function TeacherGate({ children }: { children: React.ReactNode }) {
  const { hasAccess, isLoading } = useTeacherAccess();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !hasAccess && pathname) {
      const locale = pathname.split('/')[1] || 'en';
      const from = encodeURIComponent(pathname);
      router.replace(`/${locale}/education/access?from=${from}`);
    }
  }, [hasAccess, isLoading, pathname, router]);

  if (isLoading) return null;
  if (!hasAccess) return null;
  return <>{children}</>;
}

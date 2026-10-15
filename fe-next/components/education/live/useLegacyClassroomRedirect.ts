'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { legacyClassroomLiveRedirect } from '@/lib/education/classroomLivePath';

/** Old `/multiplayer?classroom=true` links where no middleware runs (the native shell): hand off before any join fires. */
export function useLegacyClassroomRedirect(): string | null {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? '';
  const router = useRouter();
  const target = pathname ? legacyClassroomLiveRedirect(pathname, search) : null;
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);
  return target;
}

'use client';

import { usePathname } from 'next/navigation';
import GlobalBottomNav from '@/components/GlobalBottomNav';
import { isEduAppSurface } from '@/lib/navigation/eduAppSurface';

/** The player tab bar, never mounted on classroom surfaces (teacher, student, join, pricing, live). */
export function PlayerBottomNav() {
  const pathname = usePathname();
  if (isEduAppSurface(pathname)) return null;
  return <GlobalBottomNav />;
}

export default PlayerBottomNav;

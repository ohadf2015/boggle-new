'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { keepHolidayClass } from '@/lib/holidays/holidayDom';
import { isHeavyGamePath } from '@/lib/perf/heavyGamePath';

export default function HolidayClassKeeper() {
  const pathname = usePathname();
  useEffect(() => keepHolidayClass(), []);
  useEffect(() => {
    document.body.toggleAttribute('data-holiday-calm', isHeavyGamePath(pathname));
  }, [pathname]);
  return null;
}

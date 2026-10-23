'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isEduAppSurface } from '@/lib/navigation/eduAppSurface';

/** Crawl links to the consumer site; still SSR'd, but on an edu surface every one is an exit out of the product. */
export default function SrSiteNav({ children }: { children: ReactNode }) {
  if (isEduAppSurface(usePathname())) return null;
  return (
    <nav aria-label="Site Navigation" className="sr-only">
      {children}
    </nav>
  );
}

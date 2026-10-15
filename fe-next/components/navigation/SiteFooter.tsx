'use client';

import { usePathname } from 'next/navigation';
import AutoHideFooter from '@/components/AutoHideFooter';
import { isPlanPage } from '@/lib/navigation/eduAppSurface';

/** The site footer, kept off the plan pages: it pinned over their cards, and they carry their own legal links. */
export function SiteFooter({ className }: { className?: string }) {
  const pathname = usePathname();
  if (isPlanPage(pathname)) return null;
  return <AutoHideFooter className={className} />;
}

export default SiteFooter;

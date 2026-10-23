'use client';

import { usePathname } from 'next/navigation';
import AutoHideFooter from '@/components/AutoHideFooter';
import { hidesSiteFooter } from '@/lib/navigation/eduAppSurface';

/** The consumer site footer, kept off every edu surface: its links leave the product. */
export function SiteFooter({ className }: { className?: string }) {
  const pathname = usePathname();
  if (hidesSiteFooter(pathname)) return null;
  return <AutoHideFooter className={className} />;
}

export default SiteFooter;

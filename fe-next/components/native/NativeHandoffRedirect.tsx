'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { nativeHandoffRoute } from '@/lib/native/nativeHandoff';
import { isNative } from '@/utils/platform';

/** Covers builds that predate the user-agent marker: plan pages never render inside the app. */
export default function NativeHandoffRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();

  useEffect(() => {
    if (!isNative() || !pathname) return;
    const target = nativeHandoffRoute(pathname, language);
    if (target) router.replace(target);
  }, [pathname, language, router]);

  return null;
}

'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useLanguage } from '@/contexts/LanguageContext';

export function CrazyGamesRouteGuard(): null {
  const { isOnCrazyGamesPlatform, isLoading } = useCrazyGames();
  const { language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !isOnCrazyGamesPlatform) return;
    const segments = (pathname ?? '').split('/').filter(Boolean);
    if (segments[1] !== 'multiplayer') {
      router.replace(`/${language}/multiplayer`);
    }
  }, [isOnCrazyGamesPlatform, isLoading, pathname, router, language]);

  return null;
}

'use client';

/**
 * Conditional Providers
 *
 * Landing (`/`, `/en`, `/he`, …) uses LandingSlimProviders so Auth/Music/Ads
 * stay out of the first-paint webpack graph (PSI script-eval wall).
 * EssentialProviders is next/dynamic'd and only rendered off landing — a
 * static import would still put it in the locale layout client manifest.
 *
 * Off-landing, EssentialProviders stays mounted for the rest of the session
 * (music instance, auth). Crossing landing → game remounts once; that is
 * intentional and cheaper than shipping 2.7MB of JS to every Lighthouse /en.
 */

import { usePathname } from 'next/navigation';
import { ReactNode, useMemo, lazy, Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { NextIntlClientProvider } from 'next-intl';
import { LandingSlimProviders } from './landing-slim-providers';
import { isLandingPath } from '@/lib/i18n/isLandingPath';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/shared/types/game';

const EssentialProviders = nextDynamic(
  () => import('./essential-providers').then((m) => ({ default: m.EssentialProviders })),
);
const GameSpecificProviders = nextDynamic(
  () => import('./providers').then((m) => ({ default: m.GameSpecificProviders })),
);
const NuqsAdapter = nextDynamic(
  () => import('nuqs/adapters/next/app').then((m) => ({ default: m.NuqsAdapter })),
);
const CommandPalette = lazy(() => import('@/components/CommandPalette'));

interface ConditionalProvidersProps {
  children: ReactNode;
  lang: Language;
}

const GAME_ROUTES = [
  '/multiplayer',
  '/singleplayer',
  '/adventure',
  '/daily',
  '/challenge',
  '/join',
  '/brain',
  '/custom',
  '/party-screen',
  '/teacher',
  '/student',
  '/auth/callback',
  '/hebrew-multiplayer-word-game',
  '/friends',
  '/profile',
];

export function needsGameProviders(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/^\/(en|he|sv|ja|es|ru)/, '');
  return GAME_ROUTES.some(route => path.startsWith(route));
}

export function ConditionalProviders({ children, lang }: ConditionalProvidersProps) {
  const pathname = usePathname();
  const initialTranslations = getCachedTranslation(lang);
  const landing = isLandingPath(pathname || '');

  const needsGameStack = useMemo(() => {
    return needsGameProviders(pathname);
  }, [pathname]);

  if (landing) {
    return (
      <NextIntlClientProvider locale={lang} timeZone="UTC" messages={initialTranslations as Record<string, unknown>}>
        <LandingSlimProviders lang={lang} initialTranslations={initialTranslations}>
          {children}
        </LandingSlimProviders>
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={lang} timeZone="UTC" messages={initialTranslations as Record<string, unknown>}>
      <NuqsAdapter>
        <EssentialProviders lang={lang} initialTranslations={initialTranslations}>
          {needsGameStack ? (
            <GameSpecificProviders>
              {children}
            </GameSpecificProviders>
          ) : (
            children
          )}
          <Suspense fallback={null}>
            <CommandPalette />
          </Suspense>
        </EssentialProviders>
      </NuqsAdapter>
    </NextIntlClientProvider>
  );
}

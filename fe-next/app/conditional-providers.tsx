'use client';

/**
 * Conditional Providers - Intelligently loads providers based on route
 *
 * ARCHITECTURE:
 * - EssentialProviders is ALWAYS mounted and provides base functionality
 *   (Theme, Language, Auth, Music, SFX, Haptics, Accessibility, Motion, Navigation)
 * - GameSpecificProviders are conditionally added INSIDE EssentialProviders
 *   for game pages (Socket, GameState, Achievements, Coins, etc.)
 *
 * CRITICAL: EssentialProviders must NEVER unmount during navigation.
 * This prevents issues like:
 * - Duplicate MusicProvider instances causing duplicate audio playback
 * - Loss of audio state (current track, volume, mute state)
 * - Memory leaks from unreleased Howl instances
 */

import { usePathname } from 'next/navigation';
import { ReactNode, useMemo, lazy, Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { GameSpecificProviders } from './providers';
import { EssentialProviders } from './essential-providers';

const CommandPalette = lazy(() => import('@/components/CommandPalette'));
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/shared/types/game';

interface ConditionalProvidersProps {
  children: ReactNode;
  lang: Language;
}

// Routes that need the full provider stack (Socket.IO, game state, etc.)
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
  '/auth/callback',  // Auth callback needs full providers
  '/hebrew-multiplayer-word-game',  // SEO page
  // Social routes need Socket.IO for realtime gift/friend-request delivery
  '/friends',
  '/profile',
];

/**
 * Determines if the current route needs game-specific providers
 */
export function needsGameProviders(pathname: string | null): boolean {
  if (!pathname) return false;

  // Remove locale prefix (e.g., /en/multiplayer -> /multiplayer)
  const path = pathname.replace(/^\/(en|he|sv|ja|es|ru)/, '');

  return GAME_ROUTES.some(route => path.startsWith(route));
}

/**
 * ConditionalProviders - Routes to appropriate provider stack
 *
 * IMPORTANT: EssentialProviders is ALWAYS rendered to ensure:
 * - Single MusicProvider instance (prevents duplicate music)
 * - Consistent audio state across navigation
 * - No memory leaks from provider remounting
 *
 * Game-specific providers are added conditionally inside EssentialProviders.
 */
export function ConditionalProviders({ children, lang }: ConditionalProvidersProps) {
  const pathname = usePathname();

  // Read the catalogue instead of receiving it as a prop. As a prop it crossed
  // the server→client boundary, so React serialised ~525kB of JSON into every
  // page's RSC flight payload. Both sides can source it locally: on the server
  // getCachedTranslation() require()s the file, in the browser it reads the
  // global set by the hashed <head> asset — which runs before hydration, so
  // both renders see identical strings.
  const initialTranslations = getCachedTranslation(lang);

  const needsGameStack = useMemo(() => {
    return needsGameProviders(pathname);
  }, [pathname]);

  // ALWAYS wrap with EssentialProviders first (never remounts on navigation)
  // Conditionally add game-specific providers inside
  return (
    <NextIntlClientProvider locale={lang} messages={initialTranslations as Record<string, unknown>}>
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

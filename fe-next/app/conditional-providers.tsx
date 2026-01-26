'use client';

/**
 * Conditional Providers - Intelligently loads providers based on route
 * Landing pages get minimal providers, game pages get full stack
 */

import { usePathname } from 'next/navigation';
import { ReactNode, useMemo } from 'react';
import { Providers } from './providers';
import { EssentialProviders } from './essential-providers';
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
];

// Routes that need partial providers (auth but not game state)
const AUTH_ROUTES = [
  '/profile',
  '/settings',
  '/friends',
  '/leaderboard',
  '/education',
  '/admin',
];

/**
 * Determines if the current route needs game providers
 */
function needsGameProviders(pathname: string | null): boolean {
  if (!pathname) return false;

  // Remove locale prefix (e.g., /en/multiplayer -> /multiplayer)
  const path = pathname.replace(/^\/(en|he|sv|ja|es)/, '');

  return GAME_ROUTES.some(route => path.startsWith(route));
}

/**
 * Determines if the current route needs auth providers
 */
function needsAuthProviders(pathname: string | null): boolean {
  if (!pathname) return false;

  const path = pathname.replace(/^\/(en|he|sv|ja|es)/, '');

  return AUTH_ROUTES.some(route => path.startsWith(route)) || needsGameProviders(pathname);
}

/**
 * ConditionalProviders - Routes to appropriate provider stack
 *
 * - Landing page: EssentialProviders only (~50KB)
 * - Game pages: Full Providers stack (~500KB+)
 * - Auth pages: Essential + Auth providers (~150KB)
 */
export function ConditionalProviders({ children, lang }: ConditionalProvidersProps) {
  const pathname = usePathname();

  const providerType = useMemo(() => {
    if (needsGameProviders(pathname)) {
      return 'full';
    }
    if (needsAuthProviders(pathname)) {
      return 'auth';
    }
    return 'essential';
  }, [pathname]);

  // Landing page and static pages: Use minimal providers
  if (providerType === 'essential') {
    return (
      <EssentialProviders lang={lang}>
        {children}
      </EssentialProviders>
    );
  }

  // Game pages: Use full provider stack
  // TODO: Implement 'auth' provider level for profile/settings pages
  return (
    <Providers lang={lang}>
      {children}
    </Providers>
  );
}

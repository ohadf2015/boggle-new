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
import { ReactNode, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { EssentialProviders } from './essential-providers';
import type { Language } from '@/shared/types/game';

// Lazy-load game providers — they pull in Socket.IO, game state, achievements, etc.
// Static import forced compilation of the entire game stack on every page (even landing).
const GameSpecificProviders = dynamic(
  () => import('./providers').then(m => m.GameSpecificProviders),
  { ssr: false }
);

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

/**
 * Determines if the current route needs game-specific providers
 */
function needsGameProviders(pathname: string | null): boolean {
  if (!pathname) return false;

  // Remove locale prefix (e.g., /en/multiplayer -> /multiplayer)
  const path = pathname.replace(/^\/(en|he|sv|ja|es)/, '');

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

  const needsGameStack = useMemo(() => {
    return needsGameProviders(pathname);
  }, [pathname]);

  // ALWAYS wrap with EssentialProviders first (never remounts on navigation)
  // Conditionally add game-specific providers inside
  return (
    <EssentialProviders lang={lang}>
      {needsGameStack ? (
        <GameSpecificProviders>
          {children}
        </GameSpecificProviders>
      ) : (
        children
      )}
    </EssentialProviders>
  );
}

'use client';

import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { HomeEducationCard } from '@/components/education/HomeEducationCard';

/**
 * Slim education strip right under the modes row, so a first-time teacher or a
 * student holding a class code sees that classroom mode exists without scrolling
 * to the classrooms beat. Fresh visitors have no session by definition, so this
 * is always the promo, rendered in the server HTML (no auth wait, no CLS).
 *
 * Not a story section: no `data-fresh-section`, no h2 (FreshPage pins both).
 * Hidden only in a CONFIRMED CrazyGames env, same rule as FreshClassrooms.
 */
export function FreshEduStrip() {
  const { isOnCrazyGamesPlatform, isLoading } = useCrazyGames();
  if (isOnCrazyGamesPlatform && !isLoading) return null;
  return (
    <aside data-fresh-edu-strip="" className="mx-auto -mt-6 mb-10 w-full max-w-6xl px-4 sm:px-6 md:-mt-12 md:mb-16 lg:px-8">
      <HomeEducationCard role="promo" />
    </aside>
  );
}

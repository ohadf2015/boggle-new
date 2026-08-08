import { cn } from '@/lib/utils';

/**
 * Class names for the multiplayer in-game container and its loading placeholder.
 *
 * The app is DARK-ONLY: the dark look comes from the page/body background, not a
 * resolved `dark:` Tailwind variant. So `bg-neo-cream dark:bg-neo-navy` painted
 * CREAM for the first frame (before the `dark` class lands on `<html>`), and the
 * old `transition-colors duration-300` then animated that cream→navy curtain
 * into a visible wash. On game start that container mounts UNDER the semi-
 * transparent (`bg-neo-navy/60`) 3-2-1-GO countdown overlay, so the cream FOUC
 * bled through and read as "the pre-game fanfare flashes white" — reproducing on
 * the native (Android System WebView) app, on classic/non-blast rounds (game 1
 * is forced Blast = already navy, hence "flashes after the first MP game").
 *
 * Cream is never the intended state, so we hardcode navy from the first paint
 * and drop the color transition entirely. Mirrors the MultiplayerInGameView fix
 * (66eb73c7e), closing one of the "~20+ files" instances of this latent FOUC.
 */
export function getMpInGameContainerClass(gameMode: string): string {
  return cn(
    'flex-1 flex flex-col min-h-0 overflow-x-clip bg-neo-navy',
    gameMode === 'blast' ? 'p-0' : 'p-0 md:p-4',
  );
}

/** Loading placeholder shown before the grid arrives — same navy, no FOUC. */
export function getMpInGamePlaceholderClass(): string {
  return 'flex-1 flex flex-col min-h-0 bg-neo-navy p-4 items-center justify-center';
}

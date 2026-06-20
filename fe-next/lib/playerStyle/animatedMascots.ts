/**
 * Real animated (GIF/WebP) dancing loops per player style.
 *
 * Every non-`default` style ships a transparent dancing loop (seedance/kling
 * image-to-video → per-frame rembg matte → animated WebP) so the hero mascot
 * actually dances in a genre-fitting way. A style WITHOUT a public loop here
 * falls back to the CSS `@keyframes` dance in styleDance.ts, so nothing is ever
 * left un-animated.
 *
 * `default` intentionally has no entry — it keeps the original animated mascot
 * (its art is an opaque JPG that wouldn't read as a free-floating dancer).
 *
 * Assets are transparent (`*-nobg`-style) so the mascot floats on the hero, the
 * same convention as the base mascot GIFs. Drop a file at
 * `public/mascots/styles/<key>.webp` (or `.gif`) and add the row here.
 */

import type { PlayerStyleKey } from './styles';

/** Public dancing loops — shipped to all players. */
export const ANIMATED_STYLE_MASCOTS: Partial<Record<PlayerStyleKey, string>> = {
  rock: '/mascots/styles/rock.webp',
  hasidic: '/mascots/styles/hasidic.webp',
  jazz: '/mascots/styles/jazz.webp',
  arabic: '/mascots/styles/arabic.webp',
  epic: '/mascots/styles/epic.webp',
  viking: '/mascots/styles/viking.webp',
  arcade: '/mascots/styles/arcade.webp',
  latin: '/mascots/styles/latin.webp',
  reggae: '/mascots/styles/reggae.webp',
  japanese: '/mascots/styles/japanese.webp',
  k_pop: '/mascots/styles/k_pop.webp',
  desert_epic: '/mascots/styles/desert_epic.webp',
  fanfare: '/mascots/styles/fanfare.webp',
};

/**
 * Admin-only preview loops — reserved for experimental loops (e.g. a 3D
 * spotlight variant) shown only to admins before they ship publicly. A public
 * entry always wins; this is consulted only when a style has no public loop.
 * Empty today — every style above is public.
 */
export const ADMIN_PREVIEW_STYLE_MASCOTS: Partial<Record<PlayerStyleKey, string>> = {};

export interface AnimatedMascotOptions {
  /** Admins additionally see admin-only preview loops for styles lacking a public one. */
  isAdmin?: boolean;
}

/** Animated dancing-loop path for a style, or null if it should use the CSS dance. */
export function getAnimatedMascot(
  key: PlayerStyleKey,
  opts: AnimatedMascotOptions = {},
): string | null {
  const published = ANIMATED_STYLE_MASCOTS[key];
  if (published) return published; // public loop always wins, for everyone
  if (opts.isAdmin) return ADMIN_PREVIEW_STYLE_MASCOTS[key] ?? null;
  return null;
}

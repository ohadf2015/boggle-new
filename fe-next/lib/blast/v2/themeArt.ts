/**
 * Per-theme chip artwork for Wordfall levels — surfaced on the level intro,
 * the HUD theme label, and the result card. Replaces the old emoji map: an
 * emoji renders as a different picture on every platform, can't take the
 * brand palette, and reads as a foreign object next to neo-brutalist chrome.
 *
 * Each chip is a hand-authored 64x64 SVG in `public/themes/`, drawn to the
 * contract in the Wordfall art spec (plate + object, hard offset shadow,
 * three fills max). Keys are `ThemeKey`s, which are locale-independent, so
 * one file serves all five locales.
 *
 * Procedurally generated levels can carry novel theme ids, so unknown keys
 * fall back to the neutral `onboarding` key chip rather than an empty slot.
 */
import type { ThemeKey } from './types';

export const THEME_ART_KEYS: ThemeKey[] = [
  'onboarding',
  'fruits', 'animals', 'food', 'ocean', 'space',
  'nature', 'sports', 'colors', 'transport', 'body',
  'home', 'school', 'tools', 'weather', 'music',
  'jobs', 'family', 'numbers', 'feelings',
  'mythology', 'science', 'travel', 'art', 'time',
  'joy', 'cozy', 'spooky', 'magic', 'adventure',
];

const FALLBACK_KEY: ThemeKey = 'onboarding';
const KNOWN = new Set<string>(THEME_ART_KEYS);

/** Public path of the chip svg for a theme. Never returns an empty string. */
export function themeArt(theme: string | undefined | null): string {
  const key = theme && KNOWN.has(theme) ? theme : FALLBACK_KEY;
  return `/themes/${key}.svg`;
}

/**
 * Pure presentation registry for multiplayer game modes.
 *
 * Single source for the extra presentation a "next-mode tease" needs beyond a
 * bare label: a colour family (electric neo-brutalist mode identity), a Lucide
 * icon name, and translation keys for the display label + a short "1-word hook"
 * (e.g. "Explode the tiles"). All keys live under `results.modeTease.*` so the
 * tease works on both the player results screen and the TV intermission.
 *
 * Framework-agnostic + pure → drives the tease banner, auto-play countdown
 * theming, and any TV header without divergence.
 */
import type { GameMode } from '../../shared/types/game';

/** The four electric mode-identity families plus the warm accent for extras. */
export const MODE_COLOR_FAMILIES = ['lime', 'pink', 'cyan', 'purple', 'orange'] as const;
export type ModeColorFamily = (typeof MODE_COLOR_FAMILIES)[number];

export interface ModePresentation {
  /** The resolved mode key ('random'/unknown collapse to 'random'). */
  mode: GameMode | 'random';
  /** Display-label translation key. */
  labelKey: string;
  /** Short "1-word tease" translation key shown under the label. */
  hookKey: string;
  /** Electric colour family for borders/glow — distinct per rotation mode. */
  color: ModeColorFamily;
  /** Lucide icon name (resolved to a component at the render site). */
  icon: string;
}

interface ModeMeta {
  /** camelCase suffix used for both label + hook translation keys. */
  slug: string;
  color: ModeColorFamily;
  icon: string;
}

/**
 * Per-mode colour / icon / key-slug. The four rotation modes
 * (classic, blast, word-hunt, wheel-rush) get FOUR DISTINCT colours so a
 * glance at the tease tells you which game is coming.
 */
const MODE_META: Record<GameMode | 'random', ModeMeta> = {
  classic: { slug: 'classic', color: 'lime', icon: 'Search' },
  blast: { slug: 'blast', color: 'pink', icon: 'Zap' },
  'word-hunt': { slug: 'wordHunt', color: 'cyan', icon: 'Target' },
  'wheel-rush': { slug: 'wheelRush', color: 'purple', icon: 'RotateCw' },
  'word-tower': { slug: 'wordTower', color: 'orange', icon: 'Building2' },
  shiritori: { slug: 'shiritori', color: 'cyan', icon: 'Link' },
  'sealed-bid': { slug: 'sealedBid', color: 'pink', icon: 'Gavel' },
  random: { slug: 'random', color: 'lime', icon: 'Shuffle' },
};

const KNOWN_MODES = new Set<string>([
  'classic',
  'blast',
  'word-hunt',
  'wheel-rush',
  'word-tower',
  'shiritori',
  'sealed-bid',
]);

/**
 * Resolve a mode value into its full presentation. Unknown / 'random' / null
 * collapse to the generic "surprise" tease so the UI never shows a raw key.
 */
export function getModePresentation(mode: string | null | undefined): ModePresentation {
  const key: GameMode | 'random' = KNOWN_MODES.has(mode ?? '')
    ? (mode as GameMode)
    : 'random';
  const meta = MODE_META[key];
  return {
    mode: key,
    labelKey: `results.modeTease.label.${meta.slug}`,
    hookKey: `results.modeTease.hook.${meta.slug}`,
    color: meta.color,
    icon: meta.icon,
  };
}

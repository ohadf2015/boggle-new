/**
 * Round-side mode identity: the colour/icon come from the shared
 * `getModePresentation` registry (one source); the name + one-line rule shown
 * on the countdown live in `mpUi.round.mode.<slug>` so every live mode
 * (crossword included) has copy in all six locales.
 */
import { Building2, Gavel, Grid2x2, Grid3x3, RotateCw, Search, Shuffle, Target, Zap, type LucideIcon } from 'lucide-react';
import { getModePresentation, type ModeColorFamily } from '@/lib/multiplayer/modePresentation';

export interface RoundModeMeta {
  slug: string;
  color: ModeColorFamily;
  icon: string;
  nameKey: string;
  ruleKey: string;
}

const SLUG: Record<string, string> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
  'word-tower': 'wordTower',
  'sealed-bid': 'sealedBid',
  crossword: 'crossword',
};

export function roundModeMeta(mode: string | null | undefined): RoundModeMeta {
  const p = getModePresentation(mode);
  const slug = SLUG[p.mode] ?? 'random';
  return {
    slug,
    color: p.color,
    icon: p.icon,
    nameKey: `mpUi.round.mode.${slug}.name`,
    ruleKey: `mpUi.round.mode.${slug}.rule`,
  };
}

/** The registry's icon names → lucide components (look up; unknown → `Shuffle`). */
export const MODE_ICONS: Record<string, LucideIcon> = { Search, Zap, Target, RotateCw, Building2, Gavel, Grid3x3, Grid2x2, Shuffle };
export const FALLBACK_MODE_ICON: LucideIcon = Shuffle;

/** Text + fill classes per colour family (dark-only surfaces). */
export const MODE_TEXT: Record<ModeColorFamily, string> = {
  lime: 'text-neo-lime',
  pink: 'text-neo-pink',
  cyan: 'text-neo-cyan',
  purple: 'text-neo-purple',
  orange: 'text-neo-orange',
};

export const MODE_FILL: Record<ModeColorFamily, string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  purple: 'bg-neo-purple',
  orange: 'bg-neo-orange',
};

/** MpTimer only knows the four electric families. */
export function timerColor(color: ModeColorFamily): 'lime' | 'pink' | 'cyan' | 'purple' {
  return color === 'orange' ? 'pink' : color;
}

/**
 * The node vocabulary of the act map: one glyph, one colour and one label per
 * node kind. Flat glyphs (not painted art) on purpose — a silhouette has to be
 * told apart at 44px on a 390px phone AND across a living room, which painted
 * icons lose. The two landmarks that ARE art are the elite (the world's enemy
 * sprite) and the boss (its portrait): they are the wager and the goal.
 */
import { Swords, Skull, Gem, Store, Flame, HelpCircle, Crown, type LucideIcon } from 'lucide-react';
import { getBossImagePath } from '@/lib/adventure/bossConfig';
import type { NodeKind } from '@/lib/adventure/play/runMap';

export interface KindStyle {
  icon: LucideIcon;
  /** Tailwind background for the badge when it is live (reachable / walked). */
  fill: string;
  /** Legend + aria label. */
  labelKey: string;
}

export const KIND_STYLE: Record<NodeKind, KindStyle> = {
  fight: { icon: Swords, fill: 'bg-neo-cyan', labelKey: 'adventurePlay.map.kind.fight' },
  elite: { icon: Skull, fill: 'bg-neo-pink', labelKey: 'adventurePlay.map.kind.elite' },
  treasure: { icon: Gem, fill: 'bg-neo-yellow', labelKey: 'adventurePlay.map.kind.treasure' },
  shop: { icon: Store, fill: 'bg-neo-lime', labelKey: 'adventurePlay.map.kind.shop' },
  rest: { icon: Flame, fill: 'bg-neo-orange', labelKey: 'adventurePlay.map.kind.rest' },
  event: { icon: HelpCircle, fill: 'bg-neo-purple', labelKey: 'adventurePlay.map.kind.event' },
  boss: { icon: Crown, fill: 'bg-neo-red', labelKey: 'adventurePlay.map.kind.boss' },
};

/** Legend order — the reading order of a run: what you fight, what you find, what you face. */
export const LEGEND_KINDS: NodeKind[] = ['fight', 'elite', 'treasure', 'shop', 'rest', 'event', 'boss'];

/** Sprite shown INSIDE the badge for the two landmark kinds, or null for a glyph node. */
export function nodeArt(kind: NodeKind, world: number): string | null {
  if (kind === 'boss') return getBossImagePath(world, 'idle');
  if (kind === 'elite') return `/images/adventure/enemies/w${world}-idle.webp`;
  return null;
}

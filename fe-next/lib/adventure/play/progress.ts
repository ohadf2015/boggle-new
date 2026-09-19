/**
 * Adventure progression rules — pure, the single source for BOTH the world map
 * (what looks unlocked) and the server (what may be played / what is granted).
 */
import { BOSS_LEVEL } from './levels';

export interface Completion {
  world: number;
  level: number;
  stars: number;
}

const starsAt = (c: Completion[], world: number, level: number) =>
  c.find((x) => x.world === world && x.level === level)?.stars ?? 0;

/** World N opens when world N-1's boss falls; level L opens when L-1 is cleared. */
export function canPlayLevel(completions: Completion[], world: number, level: number): boolean {
  if (level > 1) return starsAt(completions, world, level - 1) > 0;
  if (world === 1) return true;
  return starsAt(completions, world - 1, BOSS_LEVEL) > 0;
}

export const WORLD_SKIN_ITEM = (world: number) => `boss-trophy-w${world}`;

export function rewardsFor(r: { world: number; level: number; prevStars: number; stars: number; isBoss: boolean }): string[] {
  if (r.stars <= 0) return [];
  const items: string[] = [];
  if (r.prevStars === 0 && !r.isBoss) items.push(`lore-scroll-w${r.world}-l${r.level}`);
  if (r.stars === 3 && r.prevStars < 3 && !r.isBoss) items.push('rune-fragment');
  if (r.isBoss && r.prevStars === 0) items.push(WORLD_SKIN_ITEM(r.world));
  return items;
}

export function totalStarsOf(completions: Completion[]): number {
  return completions.reduce((s, c) => s + c.stars, 0);
}
